#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-prod}"
ALB_NAME="${ALB_NAME:-crm-alb-${ENVIRONMENT}}"

alb_dns=$(aws elbv2 describe-load-balancers \
  --names "$ALB_NAME" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

if [ -z "$alb_dns" ] || [ "$alb_dns" = "None" ]; then
  echo "ALB ${ALB_NAME} not found."
  exit 1
fi

base_url="http://${alb_dns}"
lead_email="demo-${GITHUB_RUN_ID:-local}-$(date +%s)@example.com"

echo "Validating public lead creation through ${base_url}/api/public/leads"

create_status=$(curl -sS -o /tmp/crm-demo-lead-create.json -w "%{http_code}" \
  -X POST "${base_url}/api/public/leads" \
  -H "Content-Type: application/json" \
  --data-binary @- <<JSON
{
  "name": "Demo MVP Cliente",
  "email": "${lead_email}",
  "phone": "11999999999",
  "source": "demo-mvp",
  "termsAccepted": true,
  "consentLgpd": true
}
JSON
)

if [ "$create_status" != "200" ] && [ "$create_status" != "201" ]; then
  echo "Lead creation failed with HTTP ${create_status}"
  cat /tmp/crm-demo-lead-create.json
  exit 1
fi

if ! grep -q '"success":true' /tmp/crm-demo-lead-create.json; then
  echo "Lead creation response did not confirm success"
  cat /tmp/crm-demo-lead-create.json
  exit 1
fi

echo "Validating backoffice lead listing with mock demo token"

list_status=$(curl -sS -o /tmp/crm-demo-leads-list.json -w "%{http_code}" \
  "${base_url}/api/backoffice/leads" \
  -H "Authorization: Bearer mock-admin-token")

if [ "$list_status" != "200" ]; then
  echo "Backoffice lead list failed with HTTP ${list_status}"
  cat /tmp/crm-demo-leads-list.json
  exit 1
fi

if ! grep -q "$lead_email" /tmp/crm-demo-leads-list.json; then
  echo "Created lead ${lead_email} was not found in backoffice list"
  cat /tmp/crm-demo-leads-list.json
  exit 1
fi

echo "Demo MVP validation passed. Lead ${lead_email} reached the database and backoffice."
