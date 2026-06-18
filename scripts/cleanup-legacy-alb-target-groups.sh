#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?Usage: cleanup-legacy-alb-target-groups.sh <environment>}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ALB_NAME="crm-alb-${ENVIRONMENT}"
API_TG_TAG_NAME="crm-api-gateway-${ENVIRONMENT}"

log() {
  echo "[cleanup-legacy-alb] $*"
}

aws_text() {
  aws "$@" --region "$AWS_REGION" --output text 2>/dev/null | tr -d '\r' || true
}

lb_arn="$(aws_text elbv2 describe-load-balancers \
  --names "$ALB_NAME" \
  --query 'LoadBalancers[0].LoadBalancerArn')"

if [ -z "$lb_arn" ] || [ "$lb_arn" = "None" ]; then
  log "ALB $ALB_NAME not found; skipping"
  exit 0
fi

listener_arn="$(aws_text elbv2 describe-listeners \
  --load-balancer-arn "$lb_arn" \
  --query "Listeners[?Port==\`80\`].ListenerArn | [0]")"

if [ -z "$listener_arn" ] || [ "$listener_arn" = "None" ]; then
  log "HTTP listener not found; skipping"
  exit 0
fi

api_tg_arn="$(aws_text resourcegroupstaggingapi get-resources \
  --resource-type-filters elasticloadbalancing:targetgroup \
  --tag-filters "Key=Name,Values=${API_TG_TAG_NAME}" \
  --query 'ResourceTagMappingList[0].ResourceARN')"

if [ -z "$api_tg_arn" ] || [ "$api_tg_arn" = "None" ]; then
  log "API Gateway target group not found by tag Name=$API_TG_TAG_NAME; skipping default listener repair"
fi

legacy_tg_arns="$(aws_text elbv2 describe-target-groups \
  --load-balancer-arn "$lb_arn" \
  --query "TargetGroups[?starts_with(TargetGroupName, 'land-') || starts_with(TargetGroupName, 'back-') || starts_with(TargetGroupName, 'front-')].TargetGroupArn")"

if [ -z "$legacy_tg_arns" ] || [ "$legacy_tg_arns" = "None" ]; then
  log "No legacy frontend target groups found"
  exit 0
fi

for legacy_tg_arn in $legacy_tg_arns; do
  log "checking references to $legacy_tg_arn"

  rule_arns="$(aws_text elbv2 describe-rules \
    --listener-arn "$listener_arn" \
    --query "Rules[?Actions[?TargetGroupArn=='${legacy_tg_arn}'] && Priority!='default'].RuleArn")"

  for rule_arn in $rule_arns; do
    if [ -n "$rule_arn" ] && [ "$rule_arn" != "None" ]; then
      log "deleting listener rule $rule_arn"
      aws elbv2 delete-rule --region "$AWS_REGION" --rule-arn "$rule_arn" >/dev/null
    fi
  done

  default_refs="$(aws_text elbv2 describe-rules \
    --listener-arn "$listener_arn" \
    --query "Rules[?Priority=='default' && Actions[?TargetGroupArn=='${legacy_tg_arn}']].RuleArn | [0]")"

  if [ -n "$default_refs" ] && [ "$default_refs" != "None" ]; then
    if [ -z "$api_tg_arn" ] || [ "$api_tg_arn" = "None" ]; then
      log "default listener references legacy target group but API target group was not found"
      exit 1
    fi

    log "repairing default listener action to API Gateway target group"
    aws elbv2 modify-listener \
      --region "$AWS_REGION" \
      --listener-arn "$listener_arn" \
      --default-actions "Type=forward,TargetGroupArn=${api_tg_arn}" >/dev/null
  fi
done

log "legacy ALB target group references cleaned"
