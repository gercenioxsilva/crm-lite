#!/usr/bin/env bash
# nuke-dev-environment.sh
#
# Removes ALL CRM dev AWS resources using only AWS CLI — no Terraform required.
# Safe to run multiple times (idempotent); skips any resource that doesn't exist.
#
# Resources deleted:
#   ECS services · task definitions · cluster
#   Lambda functions · function URLs · SQS triggers
#   SQS queues (email queue + DLQ)
#   CloudFront distributions (dev)
#   S3 static-site buckets (dev)
#   CloudFront Origin Access Controls (dev)
#   ALB listeners · target groups · load balancer
#   Service Discovery namespace + services
#   RDS PostgreSQL instance + subnet group
#   DocumentDB instances + cluster + subnet group
#   VPC Endpoints (Interface + Gateway)
#   NAT Gateway + Elastic IP
#   Route tables + subnets + Internet Gateway + Security Groups + VPC
#   IAM roles (ecsTaskExecutionRole-dev · ecsTaskRole-dev · crmLambdaExecutionRole-dev)
#   CloudWatch log groups
#   SES configuration set
#   Terraform dev workspace state (optional – see step 15)
#
# Resources NOT touched:
#   ECR repositories (shared with prod)
#   Terraform state S3 bucket (crm-terraform-state-us-east-1)
#   Any prod resource
#
# Usage:
#   CONFIRM_NUKE_DEV=crm-dev-nuke bash scripts/nuke-dev-environment.sh
#   AWS_REGION=us-east-1 CONFIRM_NUKE_DEV=crm-dev-nuke bash scripts/nuke-dev-environment.sh

set -euo pipefail

ENVIRONMENT="dev"
AWS_REGION="${AWS_REGION:-us-east-1}"
CONFIRM="${CONFIRM_NUKE_DEV:-}"

# ── Safety gate ───────────────────────────────────────────────────────────────
if [[ "$CONFIRM" != "crm-dev-nuke" ]]; then
  cat <<'EOF'
This script permanently deletes ALL CRM dev AWS resources.
It uses AWS CLI directly (no Terraform) and is safe to run multiple times.

To confirm destruction of the dev environment:
  CONFIRM_NUKE_DEV=crm-dev-nuke bash scripts/nuke-dev-environment.sh

Or with a custom region:
  AWS_REGION=us-east-1 CONFIRM_NUKE_DEV=crm-dev-nuke bash scripts/nuke-dev-environment.sh
EOF
  exit 1
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { echo "[$(date -u '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date -u '+%H:%M:%S')] ✓  $*"; }
skip() { echo "[$(date -u '+%H:%M:%S')] –  $* not found, skipping"; }
warn() { echo "[$(date -u '+%H:%M:%S')] ⚠  $*"; }

export AWS_DEFAULT_REGION="$AWS_REGION"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log "Account: ${ACCOUNT_ID}  |  Region: ${AWS_REGION}  |  Environment: ${ENVIRONMENT}"
log "Starting cleanup..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. ECS — stop services first, then delete cluster
# ─────────────────────────────────────────────────────────────────────────────
log "=== 1/15  ECS ==="
CLUSTER="crm-cluster-${ENVIRONMENT}"

cluster_status=$(aws ecs describe-clusters --clusters "$CLUSTER" \
  --query 'clusters[0].status' --output text 2>/dev/null || echo "MISSING")

if [[ "$cluster_status" == "ACTIVE" ]]; then
  for svc in "crm-api-gateway-${ENVIRONMENT}" "crm-leads-${ENVIRONMENT}"; do
    svc_status=$(aws ecs describe-services --cluster "$CLUSTER" --services "$svc" \
      --query 'services[0].status' --output text 2>/dev/null || echo "MISSING")
    if [[ "$svc_status" == "ACTIVE" ]]; then
      log "  Scaling ${svc} to 0..."
      aws ecs update-service --cluster "$CLUSTER" --service "$svc" \
        --desired-count 0 --no-cli-pager > /dev/null
      log "  Deleting ${svc}..."
      aws ecs delete-service --cluster "$CLUSTER" --service "$svc" \
        --force --no-cli-pager > /dev/null
      ok "  ECS service deleted: ${svc}"
    else
      skip "  ECS service: ${svc}"
    fi
  done

  # Deregister all task definition revisions
  for family in \
    "crm-api-gateway-${ENVIRONMENT}" \
    "crm-leads-${ENVIRONMENT}" \
    "crm-migrate-${ENVIRONMENT}"; do
    arns=$(aws ecs list-task-definitions \
      --family-prefix "$family" \
      --query 'taskDefinitionArns[]' \
      --output text 2>/dev/null || true)
    if [[ -n "$arns" ]]; then
      for arn in $arns; do
        aws ecs deregister-task-definition --task-definition "$arn" \
          --no-cli-pager > /dev/null
      done
      ok "  Task definitions deregistered: ${family}"
    else
      skip "  Task definitions: ${family}"
    fi
  done

  aws ecs delete-cluster --cluster "$CLUSTER" --no-cli-pager > /dev/null
  ok "ECS cluster deleted: ${CLUSTER}"
else
  skip "ECS cluster: ${CLUSTER}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Lambda — delete functions, URLs, SQS triggers
# ─────────────────────────────────────────────────────────────────────────────
log "=== 2/15  Lambda ==="
for fn in \
  "crm-auth-${ENVIRONMENT}" \
  "crm-email-${ENVIRONMENT}" \
  "crm-whatsapp-${ENVIRONMENT}"; do

  if aws lambda get-function --function-name "$fn" > /dev/null 2>&1; then
    # Remove function URL
    aws lambda delete-function-url-config --function-name "$fn" 2>/dev/null || true
    # Remove SQS/event source mappings
    for uuid in $(aws lambda list-event-source-mappings --function-name "$fn" \
        --query 'EventSourceMappings[].UUID' --output text 2>/dev/null); do
      aws lambda delete-event-source-mapping --uuid "$uuid" \
        --no-cli-pager > /dev/null
    done
    aws lambda delete-function --function-name "$fn"
    ok "Lambda deleted: ${fn}"
  else
    skip "Lambda: ${fn}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 3. SQS queues
# ─────────────────────────────────────────────────────────────────────────────
log "=== 3/15  SQS ==="
for q in "crm-email-queue-${ENVIRONMENT}" "crm-email-dlq-${ENVIRONMENT}"; do
  q_url=$(aws sqs get-queue-url --queue-name "$q" \
    --query QueueUrl --output text 2>/dev/null || true)
  if [[ -n "$q_url" && "$q_url" != "None" ]]; then
    aws sqs delete-queue --queue-url "$q_url"
    ok "SQS queue deleted: ${q}"
  else
    skip "SQS queue: ${q}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 4. CloudFront distributions (disable → wait → delete)
# ─────────────────────────────────────────────────────────────────────────────
log "=== 4/15  CloudFront ==="
# Find distributions tagged/commented for dev
dist_ids=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment && (contains(Comment,'dev') || contains(Comment,'Dev'))].Id" \
  --output text 2>/dev/null || true)

if [[ -z "$dist_ids" || "$dist_ids" == "None" ]]; then
  skip "CloudFront distributions (dev)"
else
  for dist_id in $dist_ids; do
    etag=$(aws cloudfront get-distribution --id "$dist_id" \
      --query 'ETag' --output text)
    enabled=$(aws cloudfront get-distribution --id "$dist_id" \
      --query 'Distribution.DistributionConfig.Enabled' --output text)

    if [[ "$enabled" == "true" ]]; then
      log "  Disabling CloudFront distribution: ${dist_id}"
      # Get full config, set Enabled=false, update
      full=$(aws cloudfront get-distribution-config --id "$dist_id")
      etag=$(echo "$full" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['ETag'])")
      cfg=$(echo "$full"  | python3 -c "
import sys, json
d = json.load(sys.stdin)
d['DistributionConfig']['Enabled'] = False
print(json.dumps(d['DistributionConfig']))
")
      aws cloudfront update-distribution \
        --id "$dist_id" \
        --distribution-config "$cfg" \
        --if-match "$etag" \
        --no-cli-pager > /dev/null
      log "  Waiting for distribution ${dist_id} to be deployed (disabled)..."
      aws cloudfront wait distribution-deployed --id "$dist_id"
      etag=$(aws cloudfront get-distribution --id "$dist_id" \
        --query 'ETag' --output text)
      ok "  CloudFront disabled: ${dist_id}"
    fi

    aws cloudfront delete-distribution --id "$dist_id" --if-match "$etag"
    ok "CloudFront distribution deleted: ${dist_id}"
  done
fi

# Delete Origin Access Controls for dev
for oac_name in \
  "crm-landing-oac-${ENVIRONMENT}" \
  "crm-backoffice-oac-${ENVIRONMENT}"; do
  oac_id=$(aws cloudfront list-origin-access-controls \
    --query "OriginAccessControlList.Items[?Name=='${oac_name}'].Id" \
    --output text 2>/dev/null || true)
  if [[ -n "$oac_id" && "$oac_id" != "None" ]]; then
    oac_etag=$(aws cloudfront get-origin-access-control --id "$oac_id" \
      --query ETag --output text)
    aws cloudfront delete-origin-access-control --id "$oac_id" --if-match "$oac_etag"
    ok "CloudFront OAC deleted: ${oac_name}"
  else
    skip "CloudFront OAC: ${oac_name}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 5. S3 static-site buckets
# ─────────────────────────────────────────────────────────────────────────────
log "=== 5/15  S3 ==="
for suffix in "landing" "backoffice"; do
  bucket="crm-lite-${suffix}-${ENVIRONMENT}-${ACCOUNT_ID}-${AWS_REGION}"
  if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
    log "  Emptying s3://${bucket}..."
    aws s3 rm "s3://${bucket}" --recursive 2>/dev/null || true
    # Handle delete markers and non-current versions if versioning was enabled
    versions=$(aws s3api list-object-versions --bucket "$bucket" \
      --query '{Objects: (Versions[].{Key:Key,VersionId:VersionId} || `[]`)}' \
      --output json 2>/dev/null || echo '{"Objects":[]}')
    markers=$(aws s3api list-object-versions --bucket "$bucket" \
      --query '{Objects: (DeleteMarkers[].{Key:Key,VersionId:VersionId} || `[]`)}' \
      --output json 2>/dev/null || echo '{"Objects":[]}')
    obj_count=$(echo "$versions" | python3 -c \
      "import sys,json; d=json.load(sys.stdin); print(len(d.get('Objects') or []))")
    mkr_count=$(echo "$markers"  | python3 -c \
      "import sys,json; d=json.load(sys.stdin); print(len(d.get('Objects') or []))")
    [[ "$obj_count" -gt 0 ]] && \
      aws s3api delete-objects --bucket "$bucket" --delete "$versions" \
        > /dev/null 2>&1 || true
    [[ "$mkr_count" -gt 0 ]] && \
      aws s3api delete-objects --bucket "$bucket" --delete "$markers" \
        > /dev/null 2>&1 || true
    aws s3api delete-bucket --bucket "$bucket" --region "$AWS_REGION"
    ok "S3 bucket deleted: ${bucket}"
  else
    skip "S3 bucket: ${bucket}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 6. ALB — listeners → load balancer → target groups
# ─────────────────────────────────────────────────────────────────────────────
log "=== 6/15  ALB ==="
alb_arn=$(aws elbv2 describe-load-balancers \
  --names "crm-alb-${ENVIRONMENT}" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || true)

if [[ -n "$alb_arn" && "$alb_arn" != "None" ]]; then
  for listener_arn in $(aws elbv2 describe-listeners \
      --load-balancer-arn "$alb_arn" \
      --query 'Listeners[].ListenerArn' --output text 2>/dev/null); do
    aws elbv2 delete-listener --listener-arn "$listener_arn"
  done

  aws elbv2 delete-load-balancer --load-balancer-arn "$alb_arn"
  log "  Waiting for ALB to be deleted..."
  aws elbv2 wait load-balancers-deleted --load-balancer-arns "$alb_arn"
  ok "ALB deleted: crm-alb-${ENVIRONMENT}"
else
  skip "ALB: crm-alb-${ENVIRONMENT}"
fi

# Target groups (by tag Environment=dev — covers orphans too)
for tg_arn in $(aws elbv2 describe-target-groups \
    --query "TargetGroups[*].TargetGroupArn" --output text 2>/dev/null); do
  tg_env=$(aws elbv2 describe-tags --resource-arns "$tg_arn" \
    --query "TagDescriptions[0].Tags[?Key=='Environment'].Value" \
    --output text 2>/dev/null || true)
  if [[ "$tg_env" == "$ENVIRONMENT" ]]; then
    aws elbv2 delete-target-group --target-group-arn "$tg_arn" 2>/dev/null || true
    ok "Target group deleted: ${tg_arn}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 7. Service Discovery
# ─────────────────────────────────────────────────────────────────────────────
log "=== 7/15  Service Discovery ==="
# The namespace name is always 'crm.local'; find the one in the dev VPC
VPC_ID_FOR_NS=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=crm-vpc-${ENVIRONMENT}" \
  --query 'Vpcs[0].VpcId' --output text 2>/dev/null || true)

ns_id=""
if [[ -n "$VPC_ID_FOR_NS" && "$VPC_ID_FOR_NS" != "None" ]]; then
  ns_id=$(aws servicediscovery list-namespaces \
    --query "Namespaces[?Properties.DnsProperties.HostedZoneId != null && Name=='crm.local'].Id | [0]" \
    --output text 2>/dev/null || true)
fi

if [[ -n "$ns_id" && "$ns_id" != "None" ]]; then
  for svc_id in $(aws servicediscovery list-services \
      --filters "Name=NAMESPACE_ID,Values=${ns_id},Condition=EQ" \
      --query 'Services[].Id' --output text 2>/dev/null); do
    # Deregister instances before deleting service
    for inst_id in $(aws servicediscovery list-instances \
        --service-id "$svc_id" \
        --query 'Instances[].Id' --output text 2>/dev/null); do
      aws servicediscovery deregister-instance \
        --service-id "$svc_id" --instance-id "$inst_id" > /dev/null 2>/dev/null || true
    done
    aws servicediscovery delete-service --id "$svc_id"
    ok "  Service Discovery service deleted: ${svc_id}"
  done
  op_id=$(aws servicediscovery delete-namespace --id "$ns_id" \
    --query 'OperationId' --output text 2>/dev/null || true)
  log "  Waiting for namespace deletion (op: ${op_id})..."
  for i in $(seq 1 20); do
    op_status=$(aws servicediscovery get-operation --operation-id "$op_id" \
      --query 'Operation.Status' --output text 2>/dev/null || echo "SUCCESS")
    [[ "$op_status" == "SUCCESS" ]] && break
    sleep 5
  done
  ok "Service Discovery namespace deleted: crm.local"
else
  skip "Service Discovery namespace: crm.local"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 8. RDS PostgreSQL
# ─────────────────────────────────────────────────────────────────────────────
log "=== 8/15  RDS ==="
RDS_ID="crm-postgres-${ENVIRONMENT}-app"
if aws rds describe-db-instances \
    --db-instance-identifier "$RDS_ID" > /dev/null 2>&1; then
  log "  Deleting RDS instance: ${RDS_ID} (no final snapshot)..."
  aws rds delete-db-instance \
    --db-instance-identifier "$RDS_ID" \
    --skip-final-snapshot \
    --delete-automated-backups
  log "  Waiting for RDS deletion (5-10 min)..."
  aws rds wait db-instance-deleted --db-instance-identifier "$RDS_ID"
  ok "RDS instance deleted: ${RDS_ID}"
else
  skip "RDS: ${RDS_ID}"
fi

# RDS subnet group (uses name_prefix — actual name has a random suffix)
for sg_name in $(aws rds describe-db-subnet-groups \
    --query "DBSubnetGroups[?starts_with(DBSubnetGroupName,'crm-db-${ENVIRONMENT}')].DBSubnetGroupName" \
    --output text 2>/dev/null); do
  aws rds delete-db-subnet-group --db-subnet-group-name "$sg_name" 2>/dev/null || true
  ok "RDS subnet group deleted: ${sg_name}"
done

# ─────────────────────────────────────────────────────────────────────────────
# 9. DocumentDB
# ─────────────────────────────────────────────────────────────────────────────
log "=== 9/15  DocumentDB ==="
DOCDB_CLUSTER="crm-docdb-${ENVIRONMENT}-app"
if aws docdb describe-db-clusters \
    --db-cluster-identifier "$DOCDB_CLUSTER" > /dev/null 2>&1; then

  # Delete cluster instances first (required before cluster)
  for inst_id in $(aws docdb describe-db-instances \
      --filters "Name=db-cluster-id,Values=${DOCDB_CLUSTER}" \
      --query 'DBInstances[].DBInstanceIdentifier' \
      --output text 2>/dev/null); do
    log "  Deleting DocDB instance: ${inst_id}..."
    aws docdb delete-db-instance \
      --db-instance-identifier "$inst_id" --no-cli-pager > /dev/null
    aws docdb wait db-instance-deleted \
      --db-instance-identifier "$inst_id"
    ok "  DocDB instance deleted: ${inst_id}"
  done

  log "  Deleting DocDB cluster: ${DOCDB_CLUSTER}..."
  aws docdb delete-db-cluster \
    --db-cluster-identifier "$DOCDB_CLUSTER" \
    --skip-final-snapshot
  aws docdb wait db-cluster-deleted \
    --db-cluster-identifier "$DOCDB_CLUSTER"
  ok "DocumentDB cluster deleted: ${DOCDB_CLUSTER}"
else
  skip "DocumentDB: ${DOCDB_CLUSTER}"
fi

# DocDB subnet group (random suffix from name_prefix)
for sg_name in $(aws docdb describe-db-subnet-groups \
    --query "DBSubnetGroups[?starts_with(DBSubnetGroupName,'crm-docdb-${ENVIRONMENT}')].DBSubnetGroupName" \
    --output text 2>/dev/null); do
  aws docdb delete-db-subnet-group --db-subnet-group-name "$sg_name" 2>/dev/null || true
  ok "DocDB subnet group deleted: ${sg_name}"
done

# ─────────────────────────────────────────────────────────────────────────────
# 10. VPC-resident resources (Endpoints → NAT GW → EIP → routes → subnets
#     → IGW → Security Groups → VPC)
# ─────────────────────────────────────────────────────────────────────────────
log "=== 10/15  VPC ==="
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=crm-vpc-${ENVIRONMENT}" \
  --query 'Vpcs[0].VpcId' --output text 2>/dev/null || true)

if [[ -z "$VPC_ID" || "$VPC_ID" == "None" ]]; then
  skip "VPC: crm-vpc-${ENVIRONMENT} — skipping all VPC resources"
else
  log "  VPC found: ${VPC_ID}"

  # 10a. VPC Endpoints
  log "  Deleting VPC Endpoints..."
  ep_ids=$(aws ec2 describe-vpc-endpoints \
    --filters "Name=vpc-id,Values=${VPC_ID}" \
    --query "VpcEndpoints[?State!='deleted'].VpcEndpointId" \
    --output text 2>/dev/null || true)
  if [[ -n "$ep_ids" && "$ep_ids" != "None" ]]; then
    aws ec2 delete-vpc-endpoints \
      --vpc-endpoint-ids $ep_ids > /dev/null
    ok "  VPC endpoints deleted: ${ep_ids}"
  else
    skip "  VPC endpoints"
  fi

  # 10b. NAT Gateway
  log "  Deleting NAT Gateway..."
  nat_id=$(aws ec2 describe-nat-gateways \
    --filter "Name=vpc-id,Values=${VPC_ID}" \
             "Name=state,Values=available,pending" \
    --query 'NatGateways[0].NatGatewayId' \
    --output text 2>/dev/null || true)

  nat_eip_alloc=""
  if [[ -n "$nat_id" && "$nat_id" != "None" ]]; then
    nat_eip_alloc=$(aws ec2 describe-nat-gateways \
      --nat-gateway-ids "$nat_id" \
      --query 'NatGateways[0].NatGatewayAddresses[0].AllocationId' \
      --output text 2>/dev/null || true)

    aws ec2 delete-nat-gateway --nat-gateway-id "$nat_id" > /dev/null
    log "  Waiting for NAT Gateway deletion (up to 3 min)..."
    for i in $(seq 1 24); do
      state=$(aws ec2 describe-nat-gateways \
        --nat-gateway-ids "$nat_id" \
        --query 'NatGateways[0].State' \
        --output text 2>/dev/null || echo "deleted")
      [[ "$state" == "deleted" ]] && break
      sleep 8
    done
    ok "  NAT Gateway deleted: ${nat_id}"
  else
    skip "  NAT Gateway"
  fi

  # 10c. Release Elastic IPs tagged for this environment + the one from NAT GW
  log "  Releasing Elastic IPs..."
  for alloc_id in $(aws ec2 describe-addresses \
      --filters "Name=tag:Environment,Values=${ENVIRONMENT}" \
      --query 'Addresses[].AllocationId' \
      --output text 2>/dev/null); do
    aws ec2 release-address --allocation-id "$alloc_id" 2>/dev/null || true
    ok "  EIP released: ${alloc_id}"
  done
  if [[ -n "$nat_eip_alloc" && "$nat_eip_alloc" != "None" ]]; then
    aws ec2 release-address --allocation-id "$nat_eip_alloc" 2>/dev/null || true
  fi

  # 10d. Route Table associations and non-main route tables
  log "  Deleting Route Tables..."
  for rt_id in $(aws ec2 describe-route-tables \
      --filters "Name=vpc-id,Values=${VPC_ID}" \
      --query 'RouteTables[].RouteTableId' \
      --output text 2>/dev/null); do
    # Disassociate non-main associations
    for assoc_id in $(aws ec2 describe-route-tables \
        --route-table-ids "$rt_id" \
        --query 'RouteTables[0].Associations[?Main!=`true`].RouteTableAssociationId' \
        --output text 2>/dev/null); do
      aws ec2 disassociate-route-table \
        --association-id "$assoc_id" 2>/dev/null || true
    done
    # Delete non-main route tables
    is_main=$(aws ec2 describe-route-tables \
      --route-table-ids "$rt_id" \
      --query 'RouteTables[0].Associations[0].Main' \
      --output text 2>/dev/null || echo "false")
    if [[ "$is_main" != "true" ]]; then
      aws ec2 delete-route-table \
        --route-table-id "$rt_id" 2>/dev/null || true
      ok "  Route table deleted: ${rt_id}"
    fi
  done

  # 10e. Subnets
  log "  Deleting Subnets..."
  for subnet_id in $(aws ec2 describe-subnets \
      --filters "Name=vpc-id,Values=${VPC_ID}" \
      --query 'Subnets[].SubnetId' \
      --output text 2>/dev/null); do
    aws ec2 delete-subnet \
      --subnet-id "$subnet_id" 2>/dev/null || true
    ok "  Subnet deleted: ${subnet_id}"
  done

  # 10f. Internet Gateway — detach then delete
  log "  Deleting Internet Gateway..."
  igw_id=$(aws ec2 describe-internet-gateways \
    --filters "Name=attachment.vpc-id,Values=${VPC_ID}" \
    --query 'InternetGateways[0].InternetGatewayId' \
    --output text 2>/dev/null || true)
  if [[ -n "$igw_id" && "$igw_id" != "None" ]]; then
    aws ec2 detach-internet-gateway \
      --internet-gateway-id "$igw_id" --vpc-id "$VPC_ID"
    aws ec2 delete-internet-gateway \
      --internet-gateway-id "$igw_id"
    ok "  Internet Gateway deleted: ${igw_id}"
  else
    skip "  Internet Gateway"
  fi

  # 10g. Security Groups — revoke all rules first to break cross-SG dependencies,
  #       then delete (skip default SG which cannot be deleted)
  log "  Deleting Security Groups..."
  sg_ids=$(aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=${VPC_ID}" \
    --query 'SecurityGroups[?GroupName!=`default`].GroupId' \
    --output text 2>/dev/null || true)

  for sg_id in $sg_ids; do
    ingress=$(aws ec2 describe-security-groups --group-ids "$sg_id" \
      --query 'SecurityGroups[0].IpPermissions' \
      --output json 2>/dev/null || echo "[]")
    egress=$(aws ec2 describe-security-groups --group-ids "$sg_id" \
      --query 'SecurityGroups[0].IpPermissionsEgress' \
      --output json 2>/dev/null || echo "[]")
    [[ "$ingress" != "[]" ]] && \
      aws ec2 revoke-security-group-ingress \
        --group-id "$sg_id" --ip-permissions "$ingress" 2>/dev/null || true
    [[ "$egress" != "[]" ]] && \
      aws ec2 revoke-security-group-egress \
        --group-id "$sg_id" --ip-permissions "$egress" 2>/dev/null || true
  done
  for sg_id in $sg_ids; do
    aws ec2 delete-security-group \
      --group-id "$sg_id" 2>/dev/null || true
    ok "  Security Group deleted: ${sg_id}"
  done

  # 10h. VPC itself
  log "  Deleting VPC: ${VPC_ID}..."
  aws ec2 delete-vpc --vpc-id "$VPC_ID"
  ok "VPC deleted: ${VPC_ID}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 11. IAM Roles
# ─────────────────────────────────────────────────────────────────────────────
log "=== 11/15  IAM Roles ==="
for role_name in \
  "ecsTaskExecutionRole-${ENVIRONMENT}" \
  "ecsTaskRole-${ENVIRONMENT}" \
  "crmLambdaExecutionRole-${ENVIRONMENT}"; do

  if aws iam get-role --role-name "$role_name" > /dev/null 2>&1; then
    # Detach managed policies
    for policy_arn in $(aws iam list-attached-role-policies \
        --role-name "$role_name" \
        --query 'AttachedPolicies[].PolicyArn' \
        --output text 2>/dev/null); do
      aws iam detach-role-policy \
        --role-name "$role_name" --policy-arn "$policy_arn"
    done
    # Delete inline policies
    for policy_name in $(aws iam list-role-policies \
        --role-name "$role_name" \
        --query 'PolicyNames[]' \
        --output text 2>/dev/null); do
      aws iam delete-role-policy \
        --role-name "$role_name" --policy-name "$policy_name"
    done
    aws iam delete-role --role-name "$role_name"
    ok "IAM role deleted: ${role_name}"
  else
    skip "IAM role: ${role_name}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 12. CloudWatch Log Groups
# ─────────────────────────────────────────────────────────────────────────────
log "=== 12/15  CloudWatch Log Groups ==="
for lg_name in \
  "/ecs/crm-${ENVIRONMENT}" \
  "/aws/lambda/crm-auth-${ENVIRONMENT}" \
  "/aws/lambda/crm-email-${ENVIRONMENT}" \
  "/aws/lambda/crm-whatsapp-${ENVIRONMENT}"; do
  exists=$(aws logs describe-log-groups \
    --log-group-name-prefix "$lg_name" \
    --query "logGroups[?logGroupName=='${lg_name}'].logGroupName" \
    --output text 2>/dev/null || true)
  if [[ -n "$exists" ]]; then
    aws logs delete-log-group --log-group-name "$lg_name"
    ok "Log group deleted: ${lg_name}"
  else
    skip "Log group: ${lg_name}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 13. SES Configuration Set
# ─────────────────────────────────────────────────────────────────────────────
log "=== 13/15  SES ==="
SES_SET="crm-${ENVIRONMENT}"
if aws sesv2 get-configuration-set --configuration-set-name "$SES_SET" > /dev/null 2>&1; then
  aws sesv2 delete-configuration-set --configuration-set-name "$SES_SET"
  ok "SES configuration set deleted: ${SES_SET}"
elif aws ses describe-configuration-set --configuration-set-name "$SES_SET" > /dev/null 2>&1; then
  aws ses delete-configuration-set --configuration-set-name "$SES_SET"
  ok "SES (v1) configuration set deleted: ${SES_SET}"
else
  skip "SES configuration set: ${SES_SET}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 14. Lambda zip packages from S3 (if stored there — only if present)
# ─────────────────────────────────────────────────────────────────────────────
log "=== 14/15  Lambda artifacts ==="
# Lambda zips are stored locally (.aws/lambda/*.zip) and uploaded during CI.
# Nothing to delete in S3 because the zips are referenced via filename= in
# the task definition (local path), not S3. Step is a no-op placeholder.
ok "Lambda artifacts: nothing to remove from S3 (local zip deploy)"

# ─────────────────────────────────────────────────────────────────────────────
# 15. Terraform dev workspace state (in shared state bucket)
# ─────────────────────────────────────────────────────────────────────────────
log "=== 15/15  Terraform State ==="
TF_BUCKET="crm-terraform-state-us-east-1"
TF_KEY="env:/dev/crm/terraform.tfstate"

if aws s3api head-object \
    --bucket "$TF_BUCKET" --key "$TF_KEY" > /dev/null 2>&1; then
  warn "Removing Terraform dev state: s3://${TF_BUCKET}/${TF_KEY}"
  aws s3 rm "s3://${TF_BUCKET}/${TF_KEY}"
  ok "Terraform dev state removed"
else
  skip "Terraform dev state: s3://${TF_BUCKET}/${TF_KEY}"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo ""
log "=================================================================="
log " Dev environment cleanup complete."
log " Resources preserved: ECR repos · prod resources · TF state bucket"
log " Next: run  terraform workspace delete dev  to drop the workspace."
log "=================================================================="
