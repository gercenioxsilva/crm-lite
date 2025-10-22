# Configuração de Secrets no GitHub

Para o deploy automático funcionar, configure os seguintes secrets no GitHub:

## Secrets Obrigatórios

### AWS Credentials
- `AWS_ACCESS_KEY_ID`: Chave de acesso AWS
- `AWS_SECRET_ACCESS_KEY`: Chave secreta AWS

### Infraestrutura (após criação via Terraform)
- `PRIVATE_SUBNET_IDS`: IDs das subnets privadas (separados por vírgula)
- `ECS_SECURITY_GROUP_ID`: ID do security group do ECS

## Como Configurar

1. Vá para Settings > Secrets and variables > Actions
2. Clique em "New repository secret"
3. Adicione cada secret com seu respectivo valor

## Nota Importante

O `AWS_ACCOUNT_ID` não é mais necessário como secret, pois é obtido automaticamente via AWS CLI durante o workflow.