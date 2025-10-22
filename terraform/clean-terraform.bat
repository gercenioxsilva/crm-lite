@echo off
echo Limpando cache e estado do Terraform...

REM Remove diretório .terraform se existir
if exist .terraform (
    echo Removendo diretório .terraform...
    rmdir /s /q .terraform
)

REM Remove arquivos de estado se existirem
if exist terraform.tfstate (
    echo Removendo terraform.tfstate...
    del terraform.tfstate
)

if exist terraform.tfstate.backup (
    echo Removendo terraform.tfstate.backup...
    del terraform.tfstate.backup
)

if exist .terraform.lock.hcl (
    echo Removendo .terraform.lock.hcl...
    del .terraform.lock.hcl
)

echo Cache limpo com sucesso!
echo Execute 'terraform init' para reinicializar.