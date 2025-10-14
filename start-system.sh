#!/bin/bash

echo "🚀 Iniciando Sistema CRM Fintech..."

echo ""
echo "📋 Passo 1: Parando serviços existentes..."
docker compose down

echo ""
echo "🗄️ Passo 2: Iniciando banco de dados..."
docker compose up -d db

echo ""
echo "⏳ Aguardando banco estar pronto (30s)..."
sleep 30

echo ""
echo "🔄 Executando migrações..."
docker compose run --rm leads-migrate

echo ""
echo "🏗️ Construindo e iniciando todos os serviços..."
docker compose up --build -d

echo ""
echo "✅ Sistema iniciado com sucesso!"
echo ""
echo "🌐 URLs disponíveis:"
echo "  - Landing Page: http://localhost:3010"
echo "  - Backoffice CRM: http://localhost:3030"
echo "  - API Gateway: http://localhost:3000"
echo "  - Demo Interativo: docs/demo.html"
echo ""
echo "📊 Para verificar status:"
echo "  docker compose ps"
echo "  docker compose logs [servico]"
echo ""