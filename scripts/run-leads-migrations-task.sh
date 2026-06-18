#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-prod}"
ECS_CLUSTER="${ECS_CLUSTER:-crm-cluster}"
MIGRATIONS_REQUIRED="${MIGRATIONS_REQUIRED:-true}"
MIGRATION_ASSIGN_PUBLIC_IP="${MIGRATION_ASSIGN_PUBLIC_IP:-ENABLED}"
MIGRATION_WAIT_TIMEOUT_SECONDS="${MIGRATION_WAIT_TIMEOUT_SECONDS:-2400}"
MIGRATION_WAIT_INTERVAL_SECONDS="${MIGRATION_WAIT_INTERVAL_SECONDS:-15}"
MIGRATION_LOG_INTERVAL_SECONDS="${MIGRATION_LOG_INTERVAL_SECONDS:-60}"

cluster_name="${ECS_CLUSTER}-${ENVIRONMENT}"

vpc_id=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=crm-vpc-${ENVIRONMENT}" \
  --query 'Vpcs[0].VpcId' \
  --output text)

private_subnets=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-private-subnet-*-${ENVIRONMENT}" \
  --query 'Subnets[].SubnetId' \
  --output text | tr '\t' ',')

public_subnets=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=crm-public-subnet-*-${ENVIRONMENT}" \
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

if [ -z "$public_subnets" ] || [ "$public_subnets" = "None" ]; then
  echo "Public subnets for environment ${ENVIRONMENT} not found."
  exit 1
fi

if [ -z "$security_group" ] || [ "$security_group" = "None" ]; then
  echo "Internal services security group for environment ${ENVIRONMENT} not found."
  exit 1
fi

migration_subnets="$public_subnets"
echo "Running migrations in ${cluster_name} with subnets ${migration_subnets}, assignPublicIp=${MIGRATION_ASSIGN_PUBLIC_IP} and security group ${security_group}"

run_task_response=$(aws ecs run-task \
  --cluster "$cluster_name" \
  --task-definition "crm-migrate-${ENVIRONMENT}" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$migration_subnets],securityGroups=[$security_group],assignPublicIp=$MIGRATION_ASSIGN_PUBLIC_IP}" \
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

# awslogs stream name format is usually {prefix}/{container}/{task-id}, but
# deployments have shown that assuming the stream name can hide the real error.
task_id=$(echo "$task_arn" | awk -F'/' '{print $NF}')
log_group="/ecs/crm-${ENVIRONMENT}"
log_stream="migrate/migrate/${task_id}"

resolve_log_stream() {
  local resolved

  resolved=$(aws logs describe-log-streams \
    --log-group-name "$log_group" \
    --log-stream-name-prefix "migrate/migrate/" \
    --order-by LastEventTime \
    --descending \
    --max-items 25 \
    --query 'logStreams[].logStreamName' \
    --output text 2>/dev/null | tr '\t' '\n' | grep "$task_id" | head -n 1 || true)

  if [ -n "$resolved" ] && [ "$resolved" != "None" ]; then
    log_stream="$resolved"
  fi
}

print_migration_logs() {
  resolve_log_stream
  echo "::group::Migration task logs (${log_group}/${log_stream})"
  aws logs get-log-events \
    --log-group-name "$log_group" \
    --log-stream-name "$log_stream" \
    --limit 200 \
    --query 'events[].message' \
    --output text 2>/dev/null || echo "(no log stream found - container may have failed before writing output)"
  echo "::endgroup::"
}

echo "Waiting up to ${MIGRATION_WAIT_TIMEOUT_SECONDS}s for migration task ${task_arn} to stop..."
start_epoch=$(date +%s)
last_log_epoch=0

while true; do
  task_status_json=$(aws ecs describe-tasks --cluster "$cluster_name" --tasks "$task_arn")
  last_status=$(echo "$task_status_json" | jq -r '.tasks[0].lastStatus // "UNKNOWN"')
  desired_status=$(echo "$task_status_json" | jq -r '.tasks[0].desiredStatus // "UNKNOWN"')
  now_epoch=$(date +%s)
  elapsed=$((now_epoch - start_epoch))

  echo "Migration task status: lastStatus=${last_status}, desiredStatus=${desired_status}, elapsed=${elapsed}s"

  if [ "$last_status" = "STOPPED" ]; then
    break
  fi

  if [ "$elapsed" -ge "$MIGRATION_WAIT_TIMEOUT_SECONDS" ]; then
    echo "Migration task did not stop within ${MIGRATION_WAIT_TIMEOUT_SECONDS}s."
    aws ecs describe-tasks \
      --cluster "$cluster_name" \
      --tasks "$task_arn" \
      --query 'tasks[0].{lastStatus:lastStatus,desiredStatus:desiredStatus,stoppedReason:stoppedReason,containers:containers[].{name:name,lastStatus:lastStatus,exitCode:exitCode,reason:reason}}' \
      --output json

    print_migration_logs

    aws ecs stop-task \
      --cluster "$cluster_name" \
      --task "$task_arn" \
      --reason "Migration wait timed out after ${MIGRATION_WAIT_TIMEOUT_SECONDS}s" >/dev/null || true

    if [ "$MIGRATIONS_REQUIRED" = "true" ]; then
      exit 1
    fi

    echo "Migration timeout is non-blocking because MIGRATIONS_REQUIRED=false. Demo MVP validation will verify the real application flow."
    exit 0
  fi

  if [ $((now_epoch - last_log_epoch)) -ge "$MIGRATION_LOG_INTERVAL_SECONDS" ]; then
    print_migration_logs
    last_log_epoch=$now_epoch
  fi

  sleep "$MIGRATION_WAIT_INTERVAL_SECONDS"
done

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

if [ "$exit_code" != "0" ]; then
  echo "Migration task failed with exit code ${exit_code}. Reason: ${stopped_reason}"
  aws ecs describe-tasks \
    --cluster "$cluster_name" \
    --tasks "$task_arn" \
    --query 'tasks[0].containers[].{name:name,exitCode:exitCode,reason:reason}' \
    --output json

  sleep 10
  print_migration_logs

  if [ "$MIGRATIONS_REQUIRED" = "true" ]; then
    exit 1
  fi

  echo "Migration failure is non-blocking because MIGRATIONS_REQUIRED=false. Demo MVP validation will verify the real application flow."
  exit 0
fi

sleep 5
print_migration_logs
echo "Migration task completed successfully."
