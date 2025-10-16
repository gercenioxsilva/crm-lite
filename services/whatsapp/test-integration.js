// Script para testar a integração WhatsApp
// Execute com: node test-integration.js

const axios = require('axios');

const WHATSAPP_URL = 'http://localhost:3050';
const API_GATEWAY_URL = 'http://localhost:3000';

async function testWhatsAppIntegration() {
  console.log('🧪 Testando integração WhatsApp...\n');

  try {
    // 1. Testar health check
    console.log('1. Testando health check...');
    const healthResponse = await axios.get(`${WHATSAPP_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // 2. Simular criação de lead
    console.log('\n2. Simulando criação de lead...');
    const leadData = {
      id: `test-${Date.now()}`,
      name: 'João Silva Teste',
      email: 'joao.teste@email.com',
      phone: '11987654321',
      source: 'landing'
    };

    const leadResponse = await axios.post(`${WHATSAPP_URL}/simulate-lead`, leadData);
    console.log('✅ Lead simulado:', leadResponse.data);

    // 3. Testar envio de mensagem personalizada
    console.log('\n3. Testando mensagem personalizada...');
    const messageResponse = await axios.post(`${WHATSAPP_URL}/send-message`, {
      to: '5511987654321',
      message: 'Olá! Esta é uma mensagem de teste do CRM.',
      leadId: leadData.id
    });
    console.log('✅ Mensagem enviada:', messageResponse.data);

    // 4. Testar mensagem interativa
    console.log('\n4. Testando mensagem interativa...');
    const interactiveResponse = await axios.post(`${WHATSAPP_URL}/send-interactive`, {
      to: '5511987654321',
      interactive: {
        type: 'button',
        body: {
          text: 'Gostaria de agendar uma reunião?'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'yes',
                title: 'Sim, quero agendar'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'no',
                title: 'Não, obrigado'
              }
            }
          ]
        }
      }
    });
    console.log('✅ Mensagem interativa enviada:', interactiveResponse.data);

    // 5. Simular mensagem recebida
    console.log('\n5. Simulando mensagem recebida...');
    const incomingResponse = await axios.post(`${WHATSAPP_URL}/simulate-incoming`, {
      from: '5511987654321',
      message: 'Sim, tenho interesse!'
    });
    console.log('✅ Mensagem recebida processada:', incomingResponse.data);

    console.log('\n🎉 Todos os testes passaram com sucesso!');
    console.log('\n📱 Verifique os logs do serviço WhatsApp para ver as mensagens mock enviadas.');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

async function testAPIGatewayIntegration() {
  console.log('\n🌐 Testando integração via API Gateway...\n');

  try {
    // Usar token mock para desenvolvimento
    const token = 'mock-admin-token';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 1. Testar envio via API Gateway
    console.log('1. Testando envio via API Gateway...');
    const response = await axios.post(`${API_GATEWAY_URL}/whatsapp/send-message`, {
      to: '5511987654321',
      message: 'Mensagem via API Gateway',
      leadId: 'test-lead-123'
    }, { headers });

    console.log('✅ Mensagem via API Gateway:', response.data);

    console.log('\n🎉 Teste do API Gateway concluído!');

  } catch (error) {
    console.error('❌ Erro no teste do API Gateway:', error.response?.data || error.message);
  }
}

// Executar testes
async function runTests() {
  await testWhatsAppIntegration();
  await testAPIGatewayIntegration();
}

runTests();