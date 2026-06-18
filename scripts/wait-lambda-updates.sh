#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-prod}"
LAMBDA_WAIT_TIMEOUT_SECONDS="${LAMBDA_WAIT_TIMEOUT_SECONDS:-900}"
LAMBDA_WAIT_INTERVAL_SECONDS="${LAMBDA_WAIT_INTERVAL_SECONDS:-15}"

functions=("$@")
if [ "${#functions[@]}" -eq 0 ]; then
  functions=("crm-auth-${ENVIRONMENT}" "crm-email-${ENVIRONMENT}" "crm-whatsapp-${ENVIRONMENT}")
fi

for function_name in "${functions[@]}"; do
  echo "Waiting for Lambda ${function_name} to be ready..."
  start_epoch=$(date +%s)

  while true; do
    if ! config_json=$(aws lambda get-function-configuration --function-name "$function_name" 2>/dev/null); then
      echo "Lambda ${function_name} does not exist yet. Skipping wait."
      break
    fi

    state=$(echo "$config_json" | jq -r '.State // "Unknown"')
    last_update_status=$(echo "$config_json" | jq -r '.LastUpdateStatus // "Unknown"')
    reason=$(echo "$config_json" | jq -r '.LastUpdateStatusReason // ""')
    now_epoch=$(date +%s)
    elapsed=$((now_epoch - start_epoch))

    echo "Lambda ${function_name}: state=${state}, lastUpdateStatus=${last_update_status}, elapsed=${elapsed}s"

    if [ "$state" = "Active" ] && [ "$last_update_status" != "InProgress" ]; then
      if [ "$last_update_status" = "Failed" ]; then
        echo "Lambda ${function_name} last update failed: ${reason}"
        exit 1
      fi

      break
    fi

    if [ "$elapsed" -ge "$LAMBDA_WAIT_TIMEOUT_SECONDS" ]; then
      echo "Timed out waiting for Lambda ${function_name} to become ready."
      echo "$config_json" | jq '{FunctionName, State, StateReason, LastUpdateStatus, LastUpdateStatusReason}'
      exit 1
    fi

    sleep "$LAMBDA_WAIT_INTERVAL_SECONDS"
  done
done

echo "Lambda functions are ready for Terraform updates."
