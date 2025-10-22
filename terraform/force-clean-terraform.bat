@echo off
echo ========================================
echo LIMPEZA COMPLETA DO TERRAFORM
echo ========================================

REM Remove todos os arquivos de cache e estado local
echo Removendo arquivos locais...
if exist .terraform rmdir /s /q .terraform
if exist terraform.tfstate del terraform.tfstate
if exist terraform.tfstate.backup del terraform.tfstate.backup
if exist .terraform.lock.hcl del .terraform.lock.hcl

REM Remove possíveis arquivos temporários
if exist *.tfstate.* del *.tfstate.*
if exist .terraform.* del .terraform.*

echo ========================================
echo ARQUIVOS LIMPOS COM SUCESSO!
echo ========================================
echo.
echo Próximos passos:
echo 1. Execute: terraform init
echo 2. Execute: terraform plan
echo 3. Execute: terraform apply
echo.
echo IMPORTANTE: Se o erro persistir, pode ser necessário
echo limpar o estado remoto no S3 ou usar um novo workspace.