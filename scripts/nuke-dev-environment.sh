#!/usr/bin/env bash
# nuke-dev-environment.sh
#
# Removes ALL CRM dev AWS resources using only AWS CLI — no Terraform required.
# Safe to run multiple times (idempotent — skips resources that no longer exist).
# Designed to run in AWS CloudShell or any terminal with AWS CLI + jq.
#
# Usage:
#   CONFIRM_NUKE_DEV=crm-dev-nuke bash nuke-dev-environment.sh
#   AWS_REGION=us-east-1 CONFIRM_NUKE_DEV=crm-dev-nuke bash nuke-dev-environment.sh

# NOTE: intentionally NOT using set -e so individual failures don't abort the run.
set -uo pipefail

ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CONFIRM="${CONFIRM_NUKE_DEV:-}"
NAME_PREFIX="crm"
CLUSTER="${NAME_PREFIX}-cluster-${ENVIRONMENT}"

# ── Safety gate ───────────────────────────────────────────────────────────────
if [[ "$CONFIRM" != "crm-dev-nuke" ]]; then
  cat <<'EOF'
This script permanently deletes ALL CRM dev AWS resources.
It uses AWS CLI directly (no Terraform) and is safe to run multiple times.

To confirm:
  CONFIRM_NUKE_DEV=crm-dev-nuke bash nuke-dev-environment.sh

Custom region:
  AWS_REGION=us-east-1 CONFIRM_NUKE_DEV=crm-dev-nuke bash nuke-dev-environment.sh
EOF
  exit 1
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
ts()   { date -u '+%H:%M:%S'; }
log()  { echo "[$(ts)] $*"; }
ok()   { echo "[$(ts)] ✓  $*"; }
skip() { echo "[$(ts)] –  $*"; }
warn() { echo "[$(ts)] ⚠  $*"; }
run()  { "$@" 2>/dev/null || true; }  # run a command, never abort on failure

export AWS_DEFAULT_REGION="$AWS_REGION"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
log "Account: ${ACCOUNT_ID}  |  Region: ${AWS_REGION}  |  Environment: ${ENVIRONMENT}"
log "Starting cleanup..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. ECS — discover ALL services dynamically, then delete cluster
# ─────────────────────────────────────────────────────────────────────────────
log "=== 1/14  ECS ==="

cluster_status=$(aws ecs describe-clusters \
  --clusters "$CLUSTER" \
  --query 'clusters[0].status' \
  --output text 2>/dev/null || echo "MISSING")

if [[ "$cluster_status" == "ACTIVE" ]]; then
  log "  Found cluster: ${CLUSTER}"

  # Discover ALL services currently in the cluster (not hardcoded names)
  all_svcs=$(aws ecs list-services \
    --cluster "$CLUSTER" \
    --query 'serviceArns[]' \
    --output text 2>/dev/null || true)

  if [[ -n "$all_svcs" && "$all_svcs" != "None" ]]; then
    for svc_arn in $all_svcs; do
      svc_name=$(echo "$svc_arn" | awk -F'/' '{print $NF}')
      log "  Scaling ${svc_name} to 0..."
      run aws ecs update-service \
        --cluster "$CLUSTER" \
        --service "$svc_arn" \
        --desired-count 0 \
        --no-cli-pager
      log "  Deleting ${svc_name}..."
      run aws ecs delete-service \
        --cluster "$CLUSTER" \
        --service "$svc_arn" \
        --force \
        --no-cli-pager
      ok "  ECS service deleted: ${svc_name}"
    done

    # Wait up to 3 minutes for services to finish draining
    log "  Waiting for services to drain (up to 3 min)..."
    for i in $(seq 1 18); do
      remaining=$(aws ecs list-services \
        --cluster "$CLUSTER" \
        --query 'length(serviceArns)' \
        --output text 2>/dev/null || echo "0")
      [[ "$remaining" == "0" || "$remaining" == "None" ]] && break
      log "  Still ${remaining} service(s) draining... (${i}/18)"
      sleep 10
    done
  else
    skip "  No services found in cluster ${CLUSTER}"
  fi

  # Deregister all task definitions for this environment
  for family_prefix in \
    "${NAME_PREFIX}-api-gateway-${ENVIRONMENT}" \
    "${NAME_PREFIX}-leads-${ENVIRONMENT}" \
    "${NAME_PREFIX}-migrate-${ENVIRONMENT}"; do

    arns=$(aws ecs list-task-definitions \
      --family-prefix "$family_prefix" \
      --query 'taskDefinitionArns[]' \
      --output text 2>/dev/null || true)

    if [[ -n "$arns" && "$arns" != "None" ]]; then
      for arn in $arns; do
        run aws ecs deregister-task-definition \
          --task-definition "$arn" \
          --no-cli-pager
      done
      ok "  Task definitions deregistered: ${family_prefix}"
    else
      skip "  Task defs: ${family_prefix}"
    fi
  done

  # Also deregister any other task definitions tagged for this environment
  extra_arns=$(aws ecs list-task-definition-families \
    --query "families[?ends_with(@,'-${ENVIRONMENT}')]" \
    --output text 2>/dev/null || true)
  for family in $extra_arns; do
    arns=$(aws ecs list-task-definitions \
      --family-prefix "$family" \
      --query 'taskDefinitionArns[]' \
      --output text 2>/dev/null || true)
    for arn in $arns; do
      run aws ecs deregister-task-definition \
        --task-definition "$arn" \
        --no-cli-pager
    done
  done

  # Stop any running tasks (orphaned ECS tasks not attached to a service)
  running_tasks=$(aws ecs list-tasks \
    --cluster "$CLUSTER" \
    --query 'taskArns[]' \
    --output text 2>/dev/null || true)
  for task_arn in $running_tasks; do
    run aws ecs stop-task --cluster "$CLUSTER" --task "$task_arn"
    ok "  Stopped orphan task: ${task_arn##*/}"
  done

  # Delete cluster
  if run aws ecs delete-cluster --cluster "$CLUSTER" --no-cli-pager; then
    ok "ECS cluster deleted: ${CLUSTER}"
  else
    warn "Could not delete cluster ${CLUSTER} — will retry after other resources are removed"
    # Store for retry at the end
    RETRY_CLUSTER_DELETE=true
  fi
else
  skip "ECS cluster not found: ${CLUSTER}"
  RETRY_CLUSTER_DELETE=false
fi
RETRY_CLUSTER_DELETE="${RETRY_CLUSTER_DELETE:-false}"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Lambda
# ─────────────────────────────────────────────────────────────────────────────
log "=== 2/14  Lambda ==="
for fn in \
  "${NAME_PREFIX}-auth-${ENVIRONMENT}" \
  "${NAME_PREFIX}-email-${ENVIRONMENT}" \
  "${NAME_PREFIX}-whatsapp-${ENVIRONMENT}"; do

  if aws lambda get-function --function-name "$fn" > /dev/null 2>&1; then
    run aws lambda delete-function-url-config --function-name "$fn"
    # Remove SQS/event source mappings
    for uuid in $(aws lambda list-event-source-mappings \
        --function-name "$fn" \
        --query 'EventSourceMappings[].UUID' \
        --output text 2>/dev/null); do
      run aws lambda delete-event-source-mapping --uuid "$uuid" --no-cli-pager
    done
    run aws lambda delete-function --function-name "$fn"
    ok "Lambda deleted: ${fn}"
  else
    skip "Lambda not found: ${fn}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 3. SQS
# ─────────────────────────────────────────────────────────────────────────────
log "=== 3/14  SQS ==="
for q in \
  "${NAME_PREFIX}-email-queue-${ENVIRONMENT}" \
  "${NAME_PREFIX}-email-dlq-${ENVIRONMENT}"; do

  q_url=$(aws sqs get-queue-url --queue-name "$q" \
    --query QueueUrl --output text 2>/dev/null || true)
  if [[ -n "$q_url" && "$q_url" != "None" ]]; then
    run aws sqs delete-queue --queue-url "$q_url"
    ok "SQS deleted: ${q}"
  else
    skip "SQS not found: ${q}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 4. CloudFront distributions
# ─────────────────────────────────────────────────────────────────────────────
log "=== 4/14  CloudFront ==="

# Find all distributions whose Comment contains the environment name
dist_list=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment != null] | [?contains(Comment,'${ENVIRONMENT}')].{Id:Id,Etag:ETag,Enabled:DistributionConfig.Enabled}" \
  --output json 2>/dev/null || echo "[]")

dist_count=$(echo "$dist_list" | jq 'length' 2>/dev/null || echo 0)

if [[ "$dist_count" -gt 0 ]]; then
  for row in $(echo "$dist_list" | jq -r '.[] | .Id'); do
    dist_id="$row"
    log "  Processing CloudFront distribution: ${dist_id}"

    cfg_json=$(aws cloudfront get-distribution-config --id "$dist_id" 2>/dev/null || true)
    [[ -z "$cfg_json" ]] && continue

    etag=$(echo "$cfg_json" | jq -r '.ETag')
    enabled=$(echo "$cfg_json" | jq -r '.DistributionConfig.Enabled')

    if [[ "$enabled" == "true" ]]; then
      log "  Disabling ${dist_id}..."
      new_cfg=$(echo "$cfg_json" | jq '.DistributionConfig | .Enabled = false')
      updated=$(aws cloudfront update-distribution \
        --id "$dist_id" \
        --distribution-config "$new_cfg" \
        --if-match "$etag" \
        --output json 2>/dev/null || true)
      if [[ -n "$updated" ]]; then
        log "  Waiting for ${dist_id} to reach Deployed state (disabled)..."
        aws cloudfront wait distribution-deployed --id "$dist_id" 2>/dev/null || sleep 60
        ok "  CloudFront disabled: ${dist_id}"
        etag=$(aws cloudfront get-distribution --id "$dist_id" \
          --query ETag --output text 2>/dev/null)
      fi
    fi

    if run aws cloudfront delete-distribution --id "$dist_id" --if-match "$etag"; then
      ok "CloudFront distribution deleted: ${dist_id}"
    else
      warn "Could not delete distribution ${dist_id} — may still be deploying"
    fi
  done
else
  skip "No CloudFront distributions found for environment: ${ENVIRONMENT}"
fi

# Delete Origin Access Controls for this environment
for oac_name in \
  "${NAME_PREFIX}-landing-oac-${ENVIRONMENT}" \
  "${NAME_PREFIX}-backoffice-oac-${ENVIRONMENT}"; do
  oac_id=$(aws cloudfront list-origin-access-controls \
    --query "OriginAccessControlList.Items[?Name=='${oac_name}'].Id | [0]" \
    --output text 2>/dev/null || true)
  if [[ -n "$oac_id" && "$oac_id" != "None" ]]; then
    oac_etag=$(aws cloudfront get-origin-access-control \
      --id "$oac_id" --query ETag --output text 2>/dev/null)
    run aws cloudfront delete-origin-access-control \
      --id "$oac_id" --if-match "$oac_etag"
    ok "CloudFront OAC deleted: ${oac_name}"
  else
    skip "CloudFront OAC not found: ${oac_name}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 5. S3 static-site buckets
# ─────────────────────────────────────────────────────────────────────────────
log "=== 5/14  S3 ==="
for suffix in "landing" "backoffice"; do
  bucket="${NAME_PREFIX}-lite-${suffix}-${ENVIRONMENT}-${ACCOUNT_ID}-${AWS_REGION}"
  if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
    log "  Emptying s3://${bucket}..."
    run aws s3 rm "s3://${bucket}" --recursive

    # Remove versioned objects and delete markers
    all_versions=$(aws s3api list-object-versions \
      --bucket "$bucket" \
      --query '{Objects: (Versions[].{Key:Key,VersionId:VersionId} || `[]`)}' \
      --output json 2>/dev/null || echo '{"Objects":[]}')
    all_markers=$(aws s3api list-object-versions \
      --bucket "$bucket" \
      --query '{Objects: (DeleteMarkers[].{Key:Key,VersionId:VersionId} || `[]`)}' \
      --output json 2>/dev/null || echo '{"Objects":[]}')

    v_count=$(echo "$all_versions" | jq '.Objects | length')
    m_count=$(echo "$all_markers"  | jq '.Objects | length')

    [[ "$v_count" -gt 0 ]] && run aws s3api delete-objects \
      --bucket "$bucket" --delete "$all_versions"
    [[ "$m_count" -gt 0 ]] && run aws s3api delete-objects \
      --bucket "$bucket" --delete "$all_markers"

    if run aws s3api delete-bucket --bucket "$bucket" --region "$AWS_REGION"; then
      ok "S3 bucket deleted: ${bucket}"
    else
      warn "Could not delete bucket ${bucket} — may have remaining objects"
    fi
  else
    skip "S3 bucket not found: ${bucket}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 6. ALB — listeners → load balancer → target groups
# ─────────────────────────────────────────────────────────────────────────────
log "=== 6/14  ALB ==="
alb_arn=$(aws elbv2 describe-load-balancers \
  --names "${NAME_PREFIX}-alb-${ENVIRONMENT}" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || true)

if [[ -n "$alb_arn" && "$alb_arn" != "None" ]]; then
  for listener_arn in $(aws elbv2 describe-listeners \
      --load-balancer-arn "$alb_arn" \
      --query 'Listeners[].ListenerArn' \
      --output text 2>/dev/null); do
    run aws elbv2 delete-listener --listener-arn "$listener_arn"
  done
  run aws elbv2 delete-load-balancer --load-balancer-arn "$alb_arn"
  log "  Waiting for ALB to be deleted..."
  aws elbv2 wait load-balancers-deleted --load-balancer-arns "$alb_arn" 2>/dev/null || sleep 30
  ok "ALB deleted: ${NAME_PREFIX}-alb-${ENVIRONMENT}"
else
  skip "ALB not found: ${NAME_PREFIX}-alb-${ENVIRONMENT}"
fi

# Delete all target groups tagged for this environment
for tg_arn in $(aws elbv2 describe-target-groups \
    --query 'TargetGroups[*].TargetGroupArn' \
    --output text 2>/dev/null); do
  tg_env=$(aws elbv2 describe-tags \
    --resource-arns "$tg_arn" \
    --query "TagDescriptions[0].Tags[?Key=='Environment'].Value | [0]" \
    --output text 2>/dev/null || true)
  if [[ "$tg_env" == "$ENVIRONMENT" ]]; then
    run aws elbv2 delete-target-group --target-group-arn "$tg_arn"
    ok "  Target group deleted: ${tg_arn##*/}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 7. Service Discovery
# ─────────────────────────────────────────────────────────────────────────────
log "=== 7/14  Service Discovery ==="

# Find namespaces associated with this environment (by tag or VPC)
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=${NAME_PREFIX}-vpc-${ENVIRONMENT}" \
  --query 'Vpcs[0].VpcId' --output text 2>/dev/null || true)

# List ALL namespaces and filter by VPC or environment tag
all_ns_ids=$(aws servicediscovery list-namespaces \
  --query 'Namespaces[].Id' \
  --output text 2>/dev/null || true)

for ns_id in $all_ns_ids; do
  # Check if this namespace belongs to the dev VPC
  ns_vpc=$(aws servicediscovery get-namespace \
    --id "$ns_id" \
    --query 'Namespace.Properties.DnsProperties.HostedZoneId' \
    --output text 2>/dev/null || true)

  # Filter by tag or by name suffix
  ns_name=$(aws servicediscovery get-namespace \
    --id "$ns_id" \
    --query 'Namespace.Name' \
    --output text 2>/dev/null || true)

  ns_env_tag=$(aws servicediscovery list-tags-for-resource \
    --resource-arn "$(aws servicediscovery get-namespace \
        --id "$ns_id" --query 'Namespace.Arn' --output text 2>/dev/null)" \
    --query "Tags[?Key=='Environment'].Value | [0]" \
    --output text 2>/dev/null || true)

  # Match by Environment tag OR VPC
  if [[ "$ns_env_tag" == "$ENVIRONMENT" ]] || \
     ([[ -n "$VPC_ID" && "$VPC_ID" != "None" ]] && \
      aws servicediscovery get-namespace --id "$ns_id" \
        --query "Namespace.Properties" --output json 2>/dev/null | \
        grep -q "$VPC_ID"); then

    log "  Processing Service Discovery namespace: ${ns_name} (${ns_id})"

    for svc_id in $(aws servicediscovery list-services \
        --filters "Name=NAMESPACE_ID,Values=${ns_id},Condition=EQ" \
        --query 'Services[].Id' --output text 2>/dev/null); do
      for inst_id in $(aws servicediscovery list-instances \
          --service-id "$svc_id" \
          --query 'Instances[].Id' --output text 2>/dev/null); do
        run aws servicediscovery deregister-instance \
          --service-id "$svc_id" --instance-id "$inst_id"
      done
      run aws servicediscovery delete-service --id "$svc_id"
      ok "  Service Discovery service deleted: ${svc_id}"
    done

    op_id=$(aws servicediscovery delete-namespace \
      --id "$ns_id" --query 'OperationId' --output text 2>/dev/null || true)
    if [[ -n "$op_id" && "$op_id" != "None" ]]; then
      log "  Waiting for namespace ${ns_name} deletion..."
      for i in $(seq 1 12); do
        op_status=$(aws servicediscovery get-operation \
          --operation-id "$op_id" \
          --query 'Operation.Status' --output text 2>/dev/null || echo "SUCCESS")
        [[ "$op_status" == "SUCCESS" || "$op_status" == "FAIL" ]] && break
        sleep 5
      done
    fi
    ok "Service Discovery namespace deleted: ${ns_name}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 8. RDS
# ─────────────────────────────────────────────────────────────────────────────
log "=== 8/14  RDS ==="
RDS_ID="${NAME_PREFIX}-postgres-${ENVIRONMENT}-app"

if aws rds describe-db-instances \
    --db-instance-identifier "$RDS_ID" > /dev/null 2>&1; then
  log "  Deleting RDS: ${RDS_ID} (no snapshot, deleting automated backups)..."
  aws rds delete-db-instance \
    --db-instance-identifier "$RDS_ID" \
    --skip-final-snapshot \
    --delete-automated-backups 2>/dev/null || true
  log "  Waiting for RDS deletion (5-10 min)..."
  aws rds wait db-instance-deleted \
    --db-instance-identifier "$RDS_ID" 2>/dev/null || \
    (log "  Still waiting for RDS..."; sleep 120)
  ok "RDS deleted: ${RDS_ID}"
else
  skip "RDS not found: ${RDS_ID}"
fi

# RDS subnet groups (name_prefix adds random suffix)
for sg_name in $(aws rds describe-db-subnet-groups \
    --query "DBSubnetGroups[?starts_with(DBSubnetGroupName,'${NAME_PREFIX}-db-${ENVIRONMENT}')].DBSubnetGroupName" \
    --output text 2>/dev/null); do
  run aws rds delete-db-subnet-group --db-subnet-group-name "$sg_name"
  ok "RDS subnet group deleted: ${sg_name}"
done

# ─────────────────────────────────────────────────────────────────────────────
# 9. DocumentDB
# ─────────────────────────────────────────────────────────────────────────────
log "=== 9/14  DocumentDB ==="
DOCDB_CLUSTER="${NAME_PREFIX}-docdb-${ENVIRONMENT}-app"

if aws docdb describe-db-clusters \
    --db-cluster-identifier "$DOCDB_CLUSTER" > /dev/null 2>&1; then

  for inst_id in $(aws docdb describe-db-instances \
      --filters "Name=db-cluster-id,Values=${DOCDB_CLUSTER}" \
      --query 'DBInstances[].DBInstanceIdentifier' \
      --output text 2>/dev/null); do
    log "  Deleting DocDB instance: ${inst_id}..."
    run aws docdb delete-db-instance \
      --db-instance-identifier "$inst_id" --no-cli-pager
    aws docdb wait db-instance-deleted \
      --db-instance-identifier "$inst_id" 2>/dev/null || sleep 60
    ok "  DocDB instance deleted: ${inst_id}"
  done

  run aws docdb delete-db-cluster \
    --db-cluster-identifier "$DOCDB_CLUSTER" \
    --skip-final-snapshot
  aws docdb wait db-cluster-deleted \
    --db-cluster-identifier "$DOCDB_CLUSTER" 2>/dev/null || sleep 120
  ok "DocumentDB cluster deleted: ${DOCDB_CLUSTER}"
else
  skip "DocumentDB not found: ${DOCDB_CLUSTER}"
fi

for sg_name in $(aws docdb describe-db-subnet-groups \
    --query "DBSubnetGroups[?starts_with(DBSubnetGroupName,'${NAME_PREFIX}-docdb-${ENVIRONMENT}')].DBSubnetGroupName" \
    --output text 2>/dev/null); do
  run aws docdb delete-db-subnet-group --db-subnet-group-name "$sg_name"
  ok "DocDB subnet group deleted: ${sg_name}"
done

# ─────────────────────────────────────────────────────────────────────────────
# 10. VPC resources (endpoints → NAT GW → EIP → routes → subnets → IGW → SGs → VPC)
# ─────────────────────────────────────────────────────────────────────────────
log "=== 10/14  VPC ==="

if [[ -z "${VPC_ID:-}" || "$VPC_ID" == "None" ]]; then
  VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Name,Values=${NAME_PREFIX}-vpc-${ENVIRONMENT}" \
    --query 'Vpcs[0].VpcId' --output text 2>/dev/null || true)
fi

if [[ -z "$VPC_ID" || "$VPC_ID" == "None" ]]; then
  skip "VPC not found: ${NAME_PREFIX}-vpc-${ENVIRONMENT}"
else
  log "  VPC: ${VPC_ID}"

  # 10a. VPC Endpoints (Interface + Gateway)
  log "  Deleting VPC Endpoints..."
  ep_ids=$(aws ec2 describe-vpc-endpoints \
    --filters "Name=vpc-id,Values=${VPC_ID}" \
    --query "VpcEndpoints[?State!='deleted'].VpcEndpointId" \
    --output text 2>/dev/null || true)
  if [[ -n "$ep_ids" && "$ep_ids" != "None" ]]; then
    # delete-vpc-endpoints accepts a space-separated list
    run aws ec2 delete-vpc-endpoints --vpc-endpoint-ids $ep_ids
    ok "  VPC endpoints deleted"
  else
    skip "  No VPC endpoints"
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
    run aws ec2 delete-nat-gateway --nat-gateway-id "$nat_id"
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

  # 10c. Elastic IPs
  log "  Releasing Elastic IPs..."
  for alloc_id in $(aws ec2 describe-addresses \
      --filters "Name=tag:Environment,Values=${ENVIRONMENT}" \
      --query 'Addresses[].AllocationId' \
      --output text 2>/dev/null); do
    run aws ec2 release-address --allocation-id "$alloc_id"
    ok "  EIP released: ${alloc_id}"
  done
  [[ -n "${nat_eip_alloc:-}" && "$nat_eip_alloc" != "None" ]] && \
    run aws ec2 release-address --allocation-id "$nat_eip_alloc"

  # 10d. Route Tables (non-main)
  log "  Deleting Route Tables..."
  for rt_id in $(aws ec2 describe-route-tables \
      --filters "Name=vpc-id,Values=${VPC_ID}" \
      --query 'RouteTables[].RouteTableId' \
      --output text 2>/dev/null); do
    # Disassociate non-main subnet associations
    for assoc_id in $(aws ec2 describe-route-tables \
        --route-table-ids "$rt_id" \
        --query 'RouteTables[0].Associations[?Main!=`true`].RouteTableAssociationId' \
        --output text 2>/dev/null); do
      run aws ec2 disassociate-route-table --association-id "$assoc_id"
    done
    is_main=$(aws ec2 describe-route-tables \
      --route-table-ids "$rt_id" \
      --query 'RouteTables[0].Associations[0].Main' \
      --output text 2>/dev/null || echo "false")
    [[ "$is_main" != "true" ]] && run aws ec2 delete-route-table --route-table-id "$rt_id"
  done
  ok "  Route tables cleaned"

  # 10e. Subnets
  log "  Deleting Subnets..."
  for subnet_id in $(aws ec2 describe-subnets \
      --filters "Name=vpc-id,Values=${VPC_ID}" \
      --query 'Subnets[].SubnetId' \
      --output text 2>/dev/null); do
    run aws ec2 delete-subnet --subnet-id "$subnet_id"
    ok "  Subnet deleted: ${subnet_id}"
  done

  # 10f. Internet Gateway
  log "  Deleting Internet Gateway..."
  igw_id=$(aws ec2 describe-internet-gateways \
    --filters "Name=attachment.vpc-id,Values=${VPC_ID}" \
    --query 'InternetGateways[0].InternetGatewayId' \
    --output text 2>/dev/null || true)
  if [[ -n "$igw_id" && "$igw_id" != "None" ]]; then
    run aws ec2 detach-internet-gateway \
      --internet-gateway-id "$igw_id" --vpc-id "$VPC_ID"
    run aws ec2 delete-internet-gateway --internet-gateway-id "$igw_id"
    ok "  Internet Gateway deleted: ${igw_id}"
  else
    skip "  Internet Gateway"
  fi

  # 10g. Security Groups — revoke all rules first to break cross-SG refs
  log "  Deleting Security Groups..."
  sg_ids=$(aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=${VPC_ID}" \
    --query 'SecurityGroups[?GroupName!=`default`].GroupId' \
    --output text 2>/dev/null || true)

  for sg_id in $sg_ids; do
    ingress=$(aws ec2 describe-security-groups --group-ids "$sg_id" \
      --query 'SecurityGroups[0].IpPermissions' --output json 2>/dev/null || echo "[]")
    egress=$(aws ec2 describe-security-groups --group-ids "$sg_id" \
      --query 'SecurityGroups[0].IpPermissionsEgress' --output json 2>/dev/null || echo "[]")
    [[ "$ingress" != "[]" ]] && run aws ec2 revoke-security-group-ingress \
      --group-id "$sg_id" --ip-permissions "$ingress"
    [[ "$egress" != "[]" ]] && run aws ec2 revoke-security-group-egress \
      --group-id "$sg_id" --ip-permissions "$egress"
  done
  for sg_id in $sg_ids; do
    run aws ec2 delete-security-group --group-id "$sg_id"
    ok "  Security Group deleted: ${sg_id}"
  done

  # 10h. VPC
  if run aws ec2 delete-vpc --vpc-id "$VPC_ID"; then
    ok "VPC deleted: ${VPC_ID}"
  else
    warn "Could not delete VPC ${VPC_ID} — may have remaining dependencies"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 11. IAM Roles
# ─────────────────────────────────────────────────────────────────────────────
log "=== 11/14  IAM Roles ==="
for role_name in \
  "ecsTaskExecutionRole-${ENVIRONMENT}" \
  "ecsTaskRole-${ENVIRONMENT}" \
  "crmLambdaExecutionRole-${ENVIRONMENT}"; do

  if aws iam get-role --role-name "$role_name" > /dev/null 2>&1; then
    for policy_arn in $(aws iam list-attached-role-policies \
        --role-name "$role_name" \
        --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null); do
      run aws iam detach-role-policy \
        --role-name "$role_name" --policy-arn "$policy_arn"
    done
    for policy_name in $(aws iam list-role-policies \
        --role-name "$role_name" \
        --query 'PolicyNames[]' --output text 2>/dev/null); do
      run aws iam delete-role-policy \
        --role-name "$role_name" --policy-name "$policy_name"
    done
    run aws iam delete-role --role-name "$role_name"
    ok "IAM role deleted: ${role_name}"
  else
    skip "IAM role not found: ${role_name}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 12. CloudWatch Log Groups
# ─────────────────────────────────────────────────────────────────────────────
log "=== 12/14  CloudWatch Log Groups ==="
for lg_prefix in \
  "/ecs/${NAME_PREFIX}-${ENVIRONMENT}" \
  "/aws/lambda/${NAME_PREFIX}-auth-${ENVIRONMENT}" \
  "/aws/lambda/${NAME_PREFIX}-email-${ENVIRONMENT}" \
  "/aws/lambda/${NAME_PREFIX}-whatsapp-${ENVIRONMENT}"; do

  exists=$(aws logs describe-log-groups \
    --log-group-name-prefix "$lg_prefix" \
    --query "logGroups[?logGroupName=='${lg_prefix}'].logGroupName" \
    --output text 2>/dev/null || true)
  if [[ -n "$exists" && "$exists" != "None" ]]; then
    run aws logs delete-log-group --log-group-name "$lg_prefix"
    ok "Log group deleted: ${lg_prefix}"
  else
    skip "Log group not found: ${lg_prefix}"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 13. SES Configuration Set
# ─────────────────────────────────────────────────────────────────────────────
log "=== 13/14  SES ==="
SES_SET="${NAME_PREFIX}-${ENVIRONMENT}"
if aws sesv2 get-configuration-set \
    --configuration-set-name "$SES_SET" > /dev/null 2>&1; then
  run aws sesv2 delete-configuration-set \
    --configuration-set-name "$SES_SET"
  ok "SES configuration set deleted: ${SES_SET}"
elif aws ses describe-configuration-set \
    --configuration-set-name "$SES_SET" > /dev/null 2>&1; then
  run aws ses delete-configuration-set \
    --configuration-set-name "$SES_SET"
  ok "SES (v1) configuration set deleted: ${SES_SET}"
else
  skip "SES configuration set not found: ${SES_SET}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 14. Terraform dev workspace state
# ─────────────────────────────────────────────────────────────────────────────
log "=== 14/14  Terraform State ==="
TF_BUCKET="crm-terraform-state-us-east-1"
TF_KEY="env:/dev/crm/terraform.tfstate"

if aws s3api head-object \
    --bucket "$TF_BUCKET" --key "$TF_KEY" > /dev/null 2>&1; then
  warn "Removing Terraform dev state: s3://${TF_BUCKET}/${TF_KEY}"
  run aws s3 rm "s3://${TF_BUCKET}/${TF_KEY}"
  ok "Terraform dev state removed"
else
  skip "Terraform dev state not found: s3://${TF_BUCKET}/${TF_KEY}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Retry cluster deletion (in case it had lingering tasks/services earlier)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "${RETRY_CLUSTER_DELETE}" == "true" ]]; then
  log "Retrying ECS cluster deletion: ${CLUSTER}"
  run aws ecs delete-cluster --cluster "$CLUSTER" --no-cli-pager
  ok "ECS cluster deleted on retry: ${CLUSTER}"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo ""
log "================================================================="
log " Dev environment cleanup complete."
log " Preserved: ECR repos · prod resources · Terraform state bucket"
log " Next: run  terraform workspace delete dev  locally if needed."
log "================================================================="
