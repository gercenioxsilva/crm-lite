import axios from 'axios';
import { WhatsAppLeadService } from './WhatsAppLeadService';

export class LeadWebhookService {
  constructor(
    private whatsappLeadService: WhatsAppLeadService,
    private leadsServiceUrl: string = process.env.LEADS_SERVICE_URL || 'http://leads:3020'
  ) {}

  async handleNewLead(leadData: any): Promise<void> {
    try {
      console.log('🔔 Novo lead recebido:', leadData);

      // Verificar se o lead tem telefone
      if (!leadData.phone || leadData.phone.trim() === '') {
        console.log('📱 Lead sem telefone, pulando WhatsApp');
        return;
      }

      // Aguardar um pouco para garantir que o lead foi salvo no banco
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Buscar dados completos do lead
      const lead = await this.getLeadById(leadData.id);
      if (!lead) {
        console.log('❌ Lead não encontrado no banco');
        return;
      }

      // Enviar mensagem de boas-vindas automaticamente
      await this.whatsappLeadService.sendWelcomeMessage(
        lead.id,
        this.normalizePhone(lead.phone),
        lead.name
      );

      // Agendar follow-up para 1 hora depois (em produção seria mais tempo)
      setTimeout(async () => {
        try {
          await this.whatsappLeadService.sendFollowUpMessage(
            lead.id,
            this.normalizePhone(lead.phone),
            lead.name
          );
        } catch (error) {
          console.error('Erro no follow-up automático:', error);
        }
      }, 60 * 60 * 1000); // 1 hora

      console.log('✅ Fluxo WhatsApp iniciado para lead:', lead.name);

    } catch (error) {
      console.error('Erro ao processar novo lead:', error);
    }
  }

  async handleLeadUpdate(leadId: string, updates: any): Promise<void> {
    try {
      // Se a temperatura mudou para 'hot', enviar mensagem de qualificação
      if (updates.temperature === 'hot') {
        const lead = await this.getLeadById(leadId);
        if (lead && lead.phone) {
          await this.whatsappLeadService.sendQualificationMessage(
            lead.id,
            this.normalizePhone(lead.phone),
            lead.name
          );
        }
      }
    } catch (error) {
      console.error('Erro ao processar atualização de lead:', error);
    }
  }

  private async getLeadById(leadId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.leadsServiceUrl}/leads/${leadId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar lead:', error);
      return null;
    }
  }

  private normalizePhone(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Se não tem código do país, adiciona 55 (Brasil)
    if (cleaned.length === 11 && cleaned.startsWith('11')) {
      return `55${cleaned}`;
    }
    
    if (cleaned.length === 10) {
      return `5511${cleaned}`;
    }
    
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  }
}