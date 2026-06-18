#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="dev"
CONFIRMATION="${CONFIRM_DESTROY_DEV:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$REPO_ROOT/terraform"

if [[ "$CONFIRMATION" != "crm-dev" ]]; then
  echo "This script destroys only the CRM dev environment."
  echo "Set CONFIRM_DESTROY_DEV=crm-dev to confirm."
  echo "Example: CONFIRM_DESTROY_DEV=crm-dev ./scripts/destroy-dev-environment.sh"
  exit 1
fi

if [[ ! -d "$TERRAFORM_DIR" ]]; then
  echo "Terraform directory not found: $TERRAFORM_DIR"
  exit 1
fi

cd "$TERRAFORM_DIR"

terraform init

if ! terraform workspace list | sed 's/^[* ]*//' | grep -qx "$ENVIRONMENT"; then
  echo "Terraform workspace '$ENVIRONMENT' does not exist. Nothing to destroy."
  exit 0
fi

terraform workspace select "$ENVIRONMENT"

if [[ -f "$REPO_ROOT/scripts/terraform-import-existing.sh" ]]; then
  bash "$REPO_ROOT/scripts/terraform-import-existing.sh" "$ENVIRONMENT"
fi

empty_bucket_if_present() {
  local output_name="$1"
  local bucket_name

  if bucket_name="$(terraform output -raw "$output_name" 2>/dev/null)" && [[ -n "$bucket_name" ]]; then
    echo "Emptying s3://$bucket_name before Terraform destroy."
    aws s3 rm "s3://$bucket_name" --recursive || true
  fi
}

empty_bucket_if_present "landing_bucket_name"
empty_bucket_if_present "backoffice_bucket_name"

terraform plan -destroy \
  -var="environment=$ENVIRONMENT" \
  -var="image_tag=latest" \
  -out=destroy-dev.tfplan

terraform apply -auto-approve destroy-dev.tfplan
rm -f destroy-dev.tfplan

terraform workspace select default
terraform workspace delete "$ENVIRONMENT" || true

echo "CRM dev environment destroyed. Keep deploy workflows restricted to prod to avoid recreating it."
