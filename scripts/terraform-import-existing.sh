#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?Usage: terraform-import-existing.sh <environment>}"
AWS_REGION="${AWS_REGION:-us-east-1}"

log() {
  echo "[terraform-import] $*"
}

aws_text() {
  aws "$@" --output text 2>/dev/null | tr -d '\r' || true
}

state_has() {
  terraform state show "$1" >/dev/null 2>&1
}

state_id() {
  terraform state show "$1" 2>/dev/null | awk -F= '/^id[[:space:]]+=/ { gsub(/[[:space:]]+/, "", $2); print $2; exit }' || true
}

state_rm_if_id_equals() {
  local address="$1"
  local legacy_id="$2"
  local current_id
  current_id="$(state_id "$address")"

  if [ "$current_id" = "$legacy_id" ]; then
    log "remove legacy state $address ($current_id)"
    terraform state rm "$address"
  fi
}

import_if_missing() {
  local address="$1"
  local import_id="${2:-}"

  if state_has "$address"; then
    log "state already has $address"
    return 0
  fi

  if [ -z "$import_id" ] || [ "$import_id" = "None" ]; then
    log "skip $address; existing resource not found"
    return 0
  fi

  log "import $address ($import_id)"
  local import_output
  local import_status
  set +e
  import_output="$(terraform import -input=false -var="environment=$ENVIRONMENT" "$address" "$import_id" 2>&1)"
  import_status=$?
  set -e

  if [ "$import_status" -eq 0 ]; then
    echo "$import_output"
    return 0
  fi

  if printf '%s' "$import_output" | grep -qi "already managing a remote object"; then
    log "state already manages $address; continuing"
    return 0
  fi

  echo "$import_output" >&2
  return "$import_status"
}

vpc_id="$(aws_text ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=crm-vpc-${ENVIRONMENT}" \
  --query 'Vpcs[0].VpcId')"

import_if_missing "aws_vpc.main" "$vpc_id"

if [ -n "$vpc_id" ] && [ "$vpc_id" != "None" ]; then
  igw_id="$(aws_text ec2 describe-internet-gateways \
    --filters "Name=attachment.vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-igw-${ENVIRONMENT}" \
    --query 'InternetGateways[0].InternetGatewayId')"
  import_if_missing "aws_internet_gateway.main" "$igw_id"

  for index in 0 1; do
    subnet_number=$((index + 1))
    public_subnet_id="$(aws_text ec2 describe-subnets \
      --filters "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-public-subnet-${subnet_number}-${ENVIRONMENT}" \
      --query 'Subnets[0].SubnetId')"
    private_subnet_id="$(aws_text ec2 describe-subnets \
      --filters "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-private-subnet-${subnet_number}-${ENVIRONMENT}" \
      --query 'Subnets[0].SubnetId')"

    import_if_missing "aws_subnet.public[${index}]" "$public_subnet_id"
    import_if_missing "aws_subnet.private[${index}]" "$private_subnet_id"
  done

  eip_allocation_id="$(aws_text ec2 describe-addresses \
    --filters "Name=tag:Name,Values=crm-nat-eip-${ENVIRONMENT}" \
    --query 'Addresses[0].AllocationId')"
  import_if_missing "aws_eip.nat" "$eip_allocation_id"

  nat_gateway_id="$(aws_text ec2 describe-nat-gateways \
    --filter "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-nat-${ENVIRONMENT}" \
    --query 'NatGateways[0].NatGatewayId')"
  import_if_missing "aws_nat_gateway.main" "$nat_gateway_id"

  public_rt_id="$(aws_text ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-public-rt-${ENVIRONMENT}" \
    --query 'RouteTables[0].RouteTableId')"
  private_rt_id="$(aws_text ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-private-rt-${ENVIRONMENT}" \
    --query 'RouteTables[0].RouteTableId')"

  import_if_missing "aws_route_table.public" "$public_rt_id"
  import_if_missing "aws_route_table.private" "$private_rt_id"

  for index in 0 1; do
    public_subnet_id="$(terraform state show "aws_subnet.public[${index}]" 2>/dev/null | awk '/^id / { print $3 }' || true)"
    private_subnet_id="$(terraform state show "aws_subnet.private[${index}]" 2>/dev/null | awk '/^id / { print $3 }' || true)"

    if [ -n "$public_rt_id" ] && [ "$public_rt_id" != "None" ] && [ -n "$public_subnet_id" ]; then
      assoc_id="$(aws_text ec2 describe-route-tables \
        --route-table-ids "$public_rt_id" \
        --query "RouteTables[0].Associations[?SubnetId=='${public_subnet_id}'].RouteTableAssociationId | [0]")"
      import_if_missing "aws_route_table_association.public[${index}]" "$assoc_id"
    fi

    if [ -n "$private_rt_id" ] && [ "$private_rt_id" != "None" ] && [ -n "$private_subnet_id" ]; then
      assoc_id="$(aws_text ec2 describe-route-tables \
        --route-table-ids "$private_rt_id" \
        --query "RouteTables[0].Associations[?SubnetId=='${private_subnet_id}'].RouteTableAssociationId | [0]")"
      import_if_missing "aws_route_table_association.private[${index}]" "$assoc_id"
    fi
  done

  for pair in \
    "aws_security_group.alb:crm-alb-${ENVIRONMENT}" \
    "aws_security_group.ecs_tasks:crm-ecs-tasks-${ENVIRONMENT}" \
    "aws_security_group.rds:crm-rds-${ENVIRONMENT}" \
    "aws_security_group.docdb:crm-docdb-${ENVIRONMENT}" \
    "aws_security_group.internal_services:crm-internal-services-${ENVIRONMENT}" \
    "aws_security_group.external_api_services:crm-external-api-services-${ENVIRONMENT}" \
    "aws_security_group.vpc_endpoints:crm-vpc-endpoints-${ENVIRONMENT}"; do
    address="${pair%%:*}"
    group_name="${pair#*:}"
    group_id="$(aws_text ec2 describe-security-groups \
      --filters "Name=vpc-id,Values=${vpc_id}" "Name=group-name,Values=${group_name}" \
      --query 'SecurityGroups[0].GroupId')"
    import_if_missing "$address" "$group_id"
  done

  lb_arn="$(aws_text elbv2 describe-load-balancers \
    --names "crm-alb-${ENVIRONMENT}" \
    --query 'LoadBalancers[0].LoadBalancerArn')"
  import_if_missing "aws_lb.main" "$lb_arn"

  if [ -n "$lb_arn" ] && [ "$lb_arn" != "None" ]; then
    listener_arn="$(aws_text elbv2 describe-listeners \
      --load-balancer-arn "$lb_arn" \
      --query "Listeners[?Port==\`80\`].ListenerArn | [0]")"
    import_if_missing "aws_lb_listener.main" "$listener_arn"

    if [ -n "$listener_arn" ] && [ "$listener_arn" != "None" ]; then
      for pair in \
        "aws_lb_listener_rule.api:100"; do
        address="${pair%%:*}"
        priority="${pair#*:}"
        rule_arn="$(aws_text elbv2 describe-rules \
          --listener-arn "$listener_arn" \
          --query "Rules[?Priority=='${priority}'].RuleArn | [0]")"
        import_if_missing "$address" "$rule_arn"
      done
    fi
  fi

  namespace_id="$(aws_text servicediscovery list-namespaces \
    --filters "Name=NAME,Values=crm.local,Condition=EQ" \
    --query 'Namespaces[0].Id')"
  import_if_missing "aws_service_discovery_private_dns_namespace.main" "$namespace_id"

  if [ -n "$namespace_id" ] && [ "$namespace_id" != "None" ]; then
    for pair in \
      "aws_service_discovery_service.leads:crm-leads-${ENVIRONMENT}"; do
      address="${pair%%:*}"
      service_name="${pair#*:}"
      service_id="$(aws_text servicediscovery list-services \
        --filters "Name=NAMESPACE_ID,Values=${namespace_id},Condition=EQ" \
        --query "Services[?Name=='${service_name}'].Id | [0]")"
      import_if_missing "$address" "$service_id"
    done
  fi

  for pair in \
    "aws_vpc_endpoint.ecr_dkr:com.amazonaws.${AWS_REGION}.ecr.dkr" \
    "aws_vpc_endpoint.ecr_api:com.amazonaws.${AWS_REGION}.ecr.api" \
    "aws_vpc_endpoint.logs:com.amazonaws.${AWS_REGION}.logs" \
    "aws_vpc_endpoint.s3:com.amazonaws.${AWS_REGION}.s3"; do
    address="${pair%%:*}"
    service_name="${pair#*:}"
    endpoint_id="$(aws_text ec2 describe-vpc-endpoints \
      --filters "Name=vpc-id,Values=${vpc_id}" "Name=service-name,Values=${service_name}" \
      --query 'VpcEndpoints[0].VpcEndpointId')"
    import_if_missing "$address" "$endpoint_id"
  done
fi

ecs_execution_role_name="$(aws_text iam get-role \
  --role-name "ecsTaskExecutionRole-${ENVIRONMENT}" \
  --query 'Role.RoleName')"
import_if_missing "aws_iam_role.ecs_task_execution_role" "$ecs_execution_role_name"

attached_execution_policy="$(aws_text iam list-attached-role-policies \
  --role-name "ecsTaskExecutionRole-${ENVIRONMENT}" \
  --query "AttachedPolicies[?PolicyArn=='arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'].PolicyArn | [0]")"
if [ -n "$attached_execution_policy" ] && [ "$attached_execution_policy" != "None" ]; then
  import_if_missing "aws_iam_role_policy_attachment.ecs_task_execution_role_policy" "ecsTaskExecutionRole-${ENVIRONMENT}/arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
fi

ecs_task_role_name="$(aws_text iam get-role \
  --role-name "ecsTaskRole-${ENVIRONMENT}" \
  --query 'Role.RoleName')"
import_if_missing "aws_iam_role.ecs_task_role" "$ecs_task_role_name"

ecs_task_policy_name="$(aws_text iam get-role-policy \
  --role-name "ecsTaskRole-${ENVIRONMENT}" \
  --policy-name "ecsTaskPolicy-${ENVIRONMENT}" \
  --query 'PolicyName')"
if [ -n "$ecs_task_policy_name" ] && [ "$ecs_task_policy_name" != "None" ]; then
  import_if_missing "aws_iam_role_policy.ecs_task_policy" "ecsTaskRole-${ENVIRONMENT}:ecsTaskPolicy-${ENVIRONMENT}"
fi

ecs_cluster_name="$(aws_text ecs describe-clusters \
  --clusters "crm-cluster-${ENVIRONMENT}" \
  --query "clusters[?status=='ACTIVE'].clusterName | [0]")"
import_if_missing "aws_ecs_cluster.main" "$ecs_cluster_name"

for pair in \
  "aws_ecs_service.api_gateway:crm-api-gateway-${ENVIRONMENT}" \
  "aws_ecs_service.leads:crm-leads-${ENVIRONMENT}"; do
  address="${pair%%:*}"
  service_name="${pair#*:}"
  service_status="$(aws_text ecs describe-services \
    --cluster "crm-cluster-${ENVIRONMENT}" \
    --services "$service_name" \
    --query 'services[0].status')"
  if [ "$service_status" = "ACTIVE" ]; then
    import_if_missing "$address" "crm-cluster-${ENVIRONMENT}/${service_name}"
  else
    import_if_missing "$address" ""
  fi
done

state_rm_if_id_equals "aws_db_subnet_group.main" "crm-db-subnet-group-${ENVIRONMENT}"
state_rm_if_id_equals "aws_db_instance.postgres" "crm-postgres-${ENVIRONMENT}"
state_rm_if_id_equals "aws_docdb_subnet_group.main" "crm-docdb-subnet-group-${ENVIRONMENT}"
state_rm_if_id_equals "aws_docdb_cluster.main" "crm-docdb-${ENVIRONMENT}"
for index in 0 1; do
  state_rm_if_id_equals "aws_docdb_cluster_instance.main[${index}]" "crm-docdb-${ENVIRONMENT}-${index}"
done

ecs_log_group="$(aws_text logs describe-log-groups \
  --log-group-name-prefix "/ecs/crm-${ENVIRONMENT}" \
  --query "logGroups[?logGroupName=='/ecs/crm-${ENVIRONMENT}'].logGroupName | [0]")"
email_log_group="$(aws_text logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/crm-email-${ENVIRONMENT}" \
  --query "logGroups[?logGroupName=='/aws/lambda/crm-email-${ENVIRONMENT}'].logGroupName | [0]")"
auth_log_group="$(aws_text logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/crm-auth-${ENVIRONMENT}" \
  --query "logGroups[?logGroupName=='/aws/lambda/crm-auth-${ENVIRONMENT}'].logGroupName | [0]")"
whatsapp_log_group="$(aws_text logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/crm-whatsapp-${ENVIRONMENT}" \
  --query "logGroups[?logGroupName=='/aws/lambda/crm-whatsapp-${ENVIRONMENT}'].logGroupName | [0]")"
import_if_missing "aws_cloudwatch_log_group.ecs" "$ecs_log_group"
import_if_missing "aws_cloudwatch_log_group.email" "$email_log_group"
import_if_missing "aws_cloudwatch_log_group.auth_lambda" "$auth_log_group"
import_if_missing "aws_cloudwatch_log_group.whatsapp_lambda" "$whatsapp_log_group"

lambda_role_name="$(aws_text iam get-role \
  --role-name "crmLambdaExecutionRole-${ENVIRONMENT}" \
  --query 'Role.RoleName')"
import_if_missing "aws_iam_role.lambda_execution_role" "$lambda_role_name"

if [ -n "$lambda_role_name" ] && [ "$lambda_role_name" != "None" ]; then
  lambda_basic_policy="$(aws_text iam list-attached-role-policies \
    --role-name "$lambda_role_name" \
    --query "AttachedPolicies[?PolicyArn=='arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'].PolicyArn | [0]")"
  if [ -n "$lambda_basic_policy" ] && [ "$lambda_basic_policy" != "None" ]; then
    import_if_missing "aws_iam_role_policy_attachment.lambda_basic_execution" "${lambda_role_name}/arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  fi

  lambda_vpc_policy="$(aws_text iam list-attached-role-policies \
    --role-name "$lambda_role_name" \
    --query "AttachedPolicies[?PolicyArn=='arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'].PolicyArn | [0]")"
  if [ -n "$lambda_vpc_policy" ] && [ "$lambda_vpc_policy" != "None" ]; then
    import_if_missing "aws_iam_role_policy_attachment.lambda_vpc_execution" "${lambda_role_name}/arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
  fi

  lambda_app_policy_name="$(aws_text iam get-role-policy \
    --role-name "$lambda_role_name" \
    --policy-name "crmLambdaAppPolicy-${ENVIRONMENT}" \
    --query 'PolicyName')"
  if [ -n "$lambda_app_policy_name" ] && [ "$lambda_app_policy_name" != "None" ]; then
    import_if_missing "aws_iam_role_policy.lambda_app_policy" "${lambda_role_name}:crmLambdaAppPolicy-${ENVIRONMENT}"
  fi
fi

for pair in \
  "aws_lambda_function.auth:crm-auth-${ENVIRONMENT}" \
  "aws_lambda_function.email:crm-email-${ENVIRONMENT}" \
  "aws_lambda_function.whatsapp:crm-whatsapp-${ENVIRONMENT}"; do
  address="${pair%%:*}"
  function_name="${pair#*:}"
  found_function="$(aws_text lambda get-function \
    --function-name "$function_name" \
    --query 'Configuration.FunctionName')"
  import_if_missing "$address" "$found_function"
done

for pair in \
  "aws_lambda_function_url.auth:crm-auth-${ENVIRONMENT}" \
  "aws_lambda_function_url.email:crm-email-${ENVIRONMENT}" \
  "aws_lambda_function_url.whatsapp:crm-whatsapp-${ENVIRONMENT}"; do
  address="${pair%%:*}"
  function_name="${pair#*:}"
  found_url="$(aws_text lambda get-function-url-config \
    --function-name "$function_name" \
    --query 'FunctionUrl')"
  if [ -n "$found_url" ] && [ "$found_url" != "None" ]; then
    import_if_missing "$address" "$function_name"
  fi
done

db_subnet_group_name="$(aws_text rds describe-db-subnet-groups \
  --query "DBSubnetGroups[?starts_with(DBSubnetGroupName, 'crm-db-${ENVIRONMENT}-') && VpcId=='${vpc_id}'].DBSubnetGroupName | [0]")"
postgres_identifier="$(aws_text rds describe-db-instances \
  --db-instance-identifier "crm-postgres-${ENVIRONMENT}-app" \
  --query 'DBInstances[0].DBInstanceIdentifier')"
docdb_subnet_group_name="$(aws_text docdb describe-db-subnet-groups \
  --query "DBSubnetGroups[?starts_with(DBSubnetGroupName, 'crm-docdb-${ENVIRONMENT}-') && VpcId=='${vpc_id}'].DBSubnetGroupName | [0]")"
docdb_cluster_identifier="$(aws_text docdb describe-db-clusters \
  --db-cluster-identifier "crm-docdb-${ENVIRONMENT}-app" \
  --query 'DBClusters[0].DBClusterIdentifier')"
import_if_missing "aws_db_subnet_group.main" "$db_subnet_group_name"
import_if_missing "aws_db_instance.postgres" "$postgres_identifier"
import_if_missing "aws_docdb_subnet_group.main" "$docdb_subnet_group_name"
import_if_missing "aws_docdb_cluster.main" "$docdb_cluster_identifier"

for index in 0 1; do
  docdb_instance_id="crm-docdb-${ENVIRONMENT}-app-${index}"
  found_docdb_instance="$(aws_text docdb describe-db-instances \
    --db-instance-identifier "$docdb_instance_id" \
    --query 'DBInstances[0].DBInstanceIdentifier')"
  import_if_missing "aws_docdb_cluster_instance.main[${index}]" "$found_docdb_instance"
done

email_queue_url="$(aws_text sqs get-queue-url \
  --queue-name "crm-email-queue-${ENVIRONMENT}" \
  --query 'QueueUrl')"
email_dlq_url="$(aws_text sqs get-queue-url \
  --queue-name "crm-email-dlq-${ENVIRONMENT}" \
  --query 'QueueUrl')"
import_if_missing "aws_sqs_queue.email_queue" "$email_queue_url"
import_if_missing "aws_sqs_queue.email_dlq" "$email_dlq_url"

ses_config_name="$(aws_text ses describe-configuration-set \
  --configuration-set-name "crm-${ENVIRONMENT}" \
  --query 'ConfigurationSet.Name')"
import_if_missing "aws_ses_configuration_set.main" "$ses_config_name"

ses_event_destination_name="$(aws_text ses describe-configuration-set \
  --configuration-set-name "crm-${ENVIRONMENT}" \
  --configuration-set-attribute-names eventDestinations \
  --query "EventDestinations[?Name=='crm-cloudwatch-${ENVIRONMENT}'].Name | [0]")"
if [ -n "$ses_event_destination_name" ] && [ "$ses_event_destination_name" != "None" ]; then
  import_if_missing "aws_ses_event_destination.cloudwatch" "crm-${ENVIRONMENT}/${ses_event_destination_name}"
fi

log "existing resource import pass complete"
