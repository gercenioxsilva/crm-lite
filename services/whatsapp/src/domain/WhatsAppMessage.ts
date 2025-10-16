export interface WhatsAppMessage {
  id?: string;
  to: string;
  type: 'text' | 'template' | 'interactive';
  content: string | WhatsAppTemplate | WhatsAppInteractive;
  leadId?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: Date;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: TemplateParameter[];
}

export interface TemplateParameter {
  type: 'text';
  text: string;
}

export interface WhatsAppInteractive {
  type: 'button' | 'list';
  header?: string;
  body: string;
  footer?: string;
  action: ButtonAction | ListAction;
}

export interface ButtonAction {
  buttons: Array<{
    type: 'reply';
    reply: {
      id: string;
      title: string;
    };
  }>;
}

export interface ListAction {
  button: string;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface WhatsAppWebhook {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}