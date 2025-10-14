# Arquitetura Hexagonal

Camadas por serviço:
- domain: entidades e regras de negócio
- application: casos de uso
- interfaces: portas de entrada (HTTP)
- infrastructure: adapters (DB, integrações) e composição

Princípios SOLID e separação de responsabilidades guiando dependências.
