#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-prod}"
ECS_CLUSTER="${ECS_CLUSTER:-crm-cluster}"
ECS_SERVICE_PREFIX="${ECS_SERVICE_PREFIX:-crm}"
WAIT_TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-1800}"
WAIT_INTERVAL_SECONDS="${WAIT_INTERVAL_SECONDS:-30}"

cluster_name="${ECS_CLUSTER}-${ENVIRONMENT}"

print_diagnostics() {
  local service="$1"
  local service_name="${ECS_SERVICE_PREFIX}-${service}-${ENVIRONMENT}"

  echo "::group::ECS diagnostics for ${service_name}"
  aws ecs describe-services \
    --cluster "$cluster_name" \
    --services "$service_name" \
    --query 'services[0].{status:status,desired:desiredCount,running:runningCount,pending:pendingCount,deployments:deployments,events:events[0:10]}' \
    --output json || true

  local stopped_tasks
  stopped_tasks=$(aws ecs list-tasks \
    --cluster "$cluster_name" \
    --service-name "$service_name" \
    --desired-status STOPPED \
    --max-results 10 \
    --query 'taskArns' \
    --output text 2>/dev/null || true)

  if [ -n "$stopped_tasks" ] && [ "$stopped_tasks" != "None" ]; then
    aws ecs describe-tasks \
      --cluster "$cluster_name" \
      --tasks $stopped_tasks \
      --query 'tasks[].{taskArn:taskArn,lastStatus:lastStatus,stopCode:stopCode,stoppedReason:stoppedReason,containers:containers[].{name:name,lastStatus:lastStatus,exitCode:exitCode,reason:reason,logStreamName:logStreamName}}' \
      --output json || true
  fi
  echo "::endgroup::"
}

wait_for_service() {
  local service="$1"
  local service_name="${ECS_SERVICE_PREFIX}-${service}-${ENVIRONMENT}"
  local deadline=$((SECONDS + WAIT_TIMEOUT_SECONDS))

  if ! aws ecs describe-services --cluster "$cluster_name" --services "$service_name" >/dev/null 2>&1; then
    echo "Service ${service_name} not found, skipping..."
    return 0
  fi

  echo "Waiting for ${service_name} to be stable for up to ${WAIT_TIMEOUT_SECONDS}s..."

  while [ "$SECONDS" -lt "$deadline" ]; do
    local status desired running pending rollout
    status=$(aws ecs describe-services --cluster "$cluster_name" --services "$service_name" --query 'services[0].status' --output text)
    desired=$(aws ecs describe-services --cluster "$cluster_name" --services "$service_name" --query 'services[0].desiredCount' --output text)
    running=$(aws ecs describe-services --cluster "$cluster_name" --services "$service_name" --query 'services[0].runningCount' --output text)
    pending=$(aws ecs describe-services --cluster "$cluster_name" --services "$service_name" --query 'services[0].pendingCount' --output text)
    rollout=$(aws ecs describe-services --cluster "$cluster_name" --services "$service_name" --query "services[0].deployments[?status=='PRIMARY'].rolloutState | [0]" --output text)

    echo "${service_name}: status=${status} desired=${desired} running=${running} pending=${pending} rollout=${rollout}"

    if [ "$status" = "ACTIVE" ] && [ "$rollout" = "COMPLETED" ] && [ "$running" = "$desired" ] && [ "$pending" = "0" ]; then
      echo "${service_name} is stable."
      return 0
    fi

    if [ "$rollout" = "FAILED" ]; then
      echo "${service_name} rollout failed."
      print_diagnostics "$service"
      return 1
    fi

    sleep "$WAIT_INTERVAL_SECONDS"
  done

  echo "${service_name} did not become stable before timeout."
  print_diagnostics "$service"
  return 1
}

if [ "$#" -eq 0 ]; then
  set -- api-gateway leads
fi

for service in "$@"; do
  wait_for_service "$service"
done
