#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-prod}"
ECS_CLUSTER="${ECS_CLUSTER:-crm-cluster}"
MIGRATIONS_REQUIRED="${MIGRATIONS_REQUIRED:-true}"

cluster_name="${ECS_CLUSTER}-${ENVIRONMENT}"

vpc_id=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=crm-vpc-${ENVIRONMENT}" \
  --query 'Vpcs[0].VpcId' \
  --output text)

private_subnets=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-private-subnet-*-${ENVIRONMENT}" \
  --query 'Subnets[].SubnetId' \
  --output text | tr '\t' ',')

security_group=$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=${vpc_id}" "Name=group-name,Values=crm-internal-services-${ENVIRONMENT}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

if [ -z "$vpc_id" ] || [ "$vpc_id" = "None" ]; then
  echo "VPC for environment ${ENVIRONMENT} not found."
  exit 1
fi

if [ -z "$private_subnets" ] || [ "$private_subnets" = "None" ]; then
  echo "Private subnets for environment ${ENVIRONMENT} not found."
  exit 1
fi

if [ -z "$security_group" ] || [ "$security_group" = "None" ]; then
  echo "Internal services security group for environment ${ENVIRONMENT} not found."
  exit 1
fi

echo "Running migrations in ${cluster_name} with subnets ${private_subnets} and security group ${security_group}"

run_task_response=$(aws ecs run-task \
  --cluster "$cluster_name" \
  --task-definition "crm-migrate-${ENVIRONMENT}" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$private_subnets],securityGroups=[$security_group]}" \
  --overrides '{
    "containerOverrides": [{
      "name": "migrate",
      "command": ["npm", "run", "migrate"]
    }]
  }')

failures=$(echo "$run_task_response" | jq -r '.failures // [] | length')
if [ "$failures" != "0" ]; then
  echo "Migration task failed to start:"
  echo "$run_task_response" | jq '.failures'
  exit 1
fi

task_arn=$(echo "$run_task_response" | jq -r '.tasks[0].taskArn // empty')

if [ -z "$task_arn" ] || [ "$task_arn" = "None" ]; then
  echo "Migration task was not started."
  exit 1
fi

echo "Waiting for migration task ${task_arn} to stop..."
aws ecs wait tasks-stopped --cluster "$cluster_name" --tasks "$task_arn"

exit_code=$(aws ecs describe-tasks \
  --cluster "$cluster_name" \
  --tasks "$task_arn" \
  --query "tasks[0].containers[?name=='migrate'].exitCode | [0]" \
  --output text)

stopped_reason=$(aws ecs describe-tasks \
  --cluster "$cluster_name" \
  --tasks "$task_arn" \
  --query 'tasks[0].stoppedReason' \
  --output text)

# awslogs stream name format: {prefix}/{container}/{task-id}
# ECS describe-tasks does not expose logStreamName; compute it from the task ARN.
task_id=$(echo "$task_arn" | awk -F'/' '{print $NF}')
log_group="/ecs/crm-${ENVIRONMENT}"
log_stream="migrate/migrate/${task_id}"

if [ "$exit_code" != "0" ]; then
  echo "Migration task failed with exit code ${exit_code}. Reason: ${stopped_reason}"
  aws ecs describe-tasks \
    --cluster "$cluster_name" \
    --tasks "$task_arn" \
    --query 'tasks[0].containers[].{name:name,exitCode:exitCode,reason:reason}' \
    --output json

  echo "::group::Migration task logs (${log_group}/${log_stream})"
  aws logs get-log-events \
    --log-group-name "$log_group" \
    --log-stream-name "$log_stream" \
    --limit 200 \
    --query 'events[].message' \
    --output text 2>/dev/null || echo "(no log stream found — container may have crashed before writing output)"
  echo "::endgroup::"

  if [ "$MIGRATIONS_REQUIRED" = "true" ]; then
    exit 1
  fi

  echo "Migration failure is non-blocking because MIGRATIONS_REQUIRED=false. Demo MVP validation will verify the real application flow."
  exit 0
fi

echo "Migration task completed successfully."
