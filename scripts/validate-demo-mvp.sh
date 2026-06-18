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

max_list_attempts=6
list_interval=5
lead_found=false

for attempt in $(seq 1 $max_list_attempts); do
  list_status=$(curl -sS -o /tmp/crm-demo-leads-list.json -w "%{http_code}" \
    "${base_url}/api/backoffice/leads" \
    -H "Authorization: Bearer mock-admin-token")

  if [ "$list_status" != "200" ]; then
    echo "Attempt ${attempt}/${max_list_attempts}: backoffice list returned HTTP ${list_status}"
    cat /tmp/crm-demo-leads-list.json
    if [ "$attempt" -lt "$max_list_attempts" ]; then
      sleep $list_interval
      continue
    fi
    echo "Backoffice lead list failed after ${max_list_attempts} attempts"
    exit 1
  fi

  if grep -q "$lead_email" /tmp/crm-demo-leads-list.json; then
    lead_found=true
    break
  fi

  echo "Attempt ${attempt}/${max_list_attempts}: lead ${lead_email} not yet visible, retrying in ${list_interval}s..."
  sleep $list_interval
done

if [ "$lead_found" != "true" ]; then
  echo "Created lead ${lead_email} was not found in backoffice list after ${max_list_attempts} attempts"
  cat /tmp/crm-demo-leads-list.json
  exit 1
fi

backoffice_domain=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='CRM Backoffice ${ENVIRONMENT}'] | [0].DomainName" \
  --output text)

if [ -z "$backoffice_domain" ] || [ "$backoffice_domain" = "None" ]; then
  echo "Backoffice CloudFront distribution was not found for environment ${ENVIRONMENT}."
  exit 1
fi

backoffice_api_url="https://${backoffice_domain}/api/backoffice/pipeline"
echo "Validating backoffice CloudFront API routing through ${backoffice_api_url}"

pipeline_status=$(curl -sS -o /tmp/crm-demo-backoffice-pipeline.json -w "%{http_code}" \
  "$backoffice_api_url" \
  -H "Authorization: Bearer mock-admin-token" \
  -H "Accept: application/json")

if [ "$pipeline_status" != "200" ]; then
  echo "Backoffice CloudFront pipeline route failed with HTTP ${pipeline_status}"
  cat /tmp/crm-demo-backoffice-pipeline.json
  exit 1
fi

if grep -Eiq '<!doctype|<html|<Error>' /tmp/crm-demo-backoffice-pipeline.json; then
  echo "Backoffice CloudFront /api route returned HTML/XML instead of JSON. Check the /api/* behavior."
  cat /tmp/crm-demo-backoffice-pipeline.json
  exit 1
fi

pipeline_first_char=$(tr -d '[:space:]' < /tmp/crm-demo-backoffice-pipeline.json | head -c 1)
if [ "$pipeline_first_char" != "[" ] && [ "$pipeline_first_char" != "{" ]; then
  echo "Backoffice CloudFront pipeline route did not return a JSON object or array."
  cat /tmp/crm-demo-backoffice-pipeline.json
  exit 1
fi

echo "Demo MVP validation passed. Lead ${lead_email} reached the database and backoffice."
