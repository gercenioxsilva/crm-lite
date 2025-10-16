import React, { useState } from 'react';

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email: string;
  temperature: string;
}

interface WhatsAppIntegrationProps {
  lead: Lead;
  onMessageSent?: () => void;
}

export const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({ lead, onMessageSent }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  // const [messageType, setMessageType] = useState<'text' | 'welcome' | 'follow-up' | 'qualification'>('text');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const hasPhone = lead.phone && lead.phone.trim() !== '';

  const sendMessage = async (type: string, customMessage?: string) => {
    if (!hasPhone) {
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let body: any = {};

      switch (type) {
        case 'welcome':
          endpoint = `/whatsapp/leads/${lead.id}/welcome`;
          body = { phone: lead.phone, name: lead.name };
          break;
        case 'follow-up':
          endpoint = `/whatsapp/leads/${lead.id}/follow-up`;
          body = { phone: lead.phone, name: lead.name };
          break;
        case 'qualification':
          endpoint = `/whatsapp/leads/${lead.id}/qualification`;
          body = { phone: lead.phone, name: lead.name };
          break;
        case 'text':
          endpoint = '/whatsapp/send-message';
          body = { to: lead.phone, message: customMessage, leadId: lead.id };
          break;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem');
      }

      setStatus('success');
      setMessage('');
      onMessageSent?.();
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustomMessage = () => {
    if (message.trim()) {
      sendMessage('text', message);
    }
  };

  if (!hasPhone) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <span>📞</span>
          <span className="text-sm">Telefone não cadastrado</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Adicione um telefone para enviar mensagens WhatsApp
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-600">📱</span>
        <h3 className="font-medium text-gray-900">WhatsApp</h3>
        <span className="text-sm text-gray-500">({lead.phone})</span>
      </div>

      {/* Status */}
      {status === 'success' && (
        <div className="flex items-center gap-2 mb-3 text-green-600 text-sm">
          <span>✅</span>
          <span>Mensagem enviada com sucesso!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 mb-3 text-red-600 text-sm">
          <span>❌</span>
          <span>Erro ao enviar mensagem</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-medium text-gray-700">Ações Rápidas</h4>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => sendMessage('welcome')}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>👋</span>
            Enviar Boas-vindas
          </button>
          
          <button
            onClick={() => sendMessage('follow-up')}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>📞</span>
            Enviar Follow-up
          </button>
          
          <button
            onClick={() => sendMessage('qualification')}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>📋</span>
            Enviar Qualificação
          </button>
        </div>
      </div>

      {/* Custom Message */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Mensagem Personalizada</h4>
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSendCustomMessage}
            disabled={loading || !message.trim()}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>📤</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
          Enviando mensagem...
        </div>
      )}
    </div>
  );
};