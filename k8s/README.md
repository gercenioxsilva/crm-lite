# Kubernetes (Kustomize)

Pré-requisitos: kubectl 1.14+, cluster disponível e acesso ao registro de imagens.

## Build e Push das imagens (exemplo)
# Execute em cada serviço (ou crie um pipeline/Makefile):
#   cd services/leads && docker build -t ghcr.io/your-org/quiz-leads:latest . && docker push ghcr.io/your-org/quiz-leads:latest
# Repita para: api-gateway, landing, backoffice, social.

## Aplicar manifests
kubectl apply -k k8s/base
# ou com overlay de dev (permite trocar tags de imagens):
kubectl apply -k k8s/dev

## Acesso
- Os Services são ClusterIP. Adicione um Ingress/LoadBalancer conforme seu ambiente para expor o api-gateway.
- Health checks em `/health` por serviço.
