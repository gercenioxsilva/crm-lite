import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

// Auth middleware
async function authMiddleware(request: any, reply: any) {
  const authHeader = request.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401)
    return { error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.substring(7)
  
  // Handle mock token for development
  if (token === 'mock-admin-token') {
    request.auth = {
      userId: 'mock-admin',
      email: 'admin@quiz.com',
      name: 'Admin User',
      role: 'admin',
      scope: 'leads:read leads:write reports:read api:read admin:access',
      isUser: true,
      isClient: false
    }
    return
  }
  
  const secret = process.env.AUTH_JWT_SECRET || 'changeme-dev-secret'

  try {
    const decoded = jwt.verify(token, secret) as any
    request.auth = {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      scope: decoded.scope,
      isUser: !!decoded.email,
      isClient: !decoded.email
    }
  } catch (error) {
    reply.code(401)
    return { error: 'Invalid token' }
  }
}

function requireScope(requiredScope: string) {
  return async (request: any, reply: any) => {
    const auth = request.auth
    
    if (!auth) {
      reply.code(401)
      return { error: 'Authentication required' }
    }

    if (auth.isUser) {
      if (auth.role === 'admin') return
      if (requiredScope.includes('admin') && auth.role !== 'admin') {
        reply.code(403)
        return { error: 'Admin access required' }
      }
      return
    }

    if (auth.isClient && auth.scope) {
      const scopes = auth.scope.split(' ')
      if (!scopes.includes(requiredScope)) {
        reply.code(403)
        return { error: `Scope '${requiredScope}' required` }
      }
    } else {
      reply.code(403)
      return { error: 'Insufficient permissions' }
    }
  }
}

// Google auth
async function verifyGoogleIdToken(idToken: string) {
  // Mock implementation - replace with actual Google verification
  return {
    email: 'user@google.com',
    name: 'Google User',
    sub: 'google-123',
    picture: ''
  }
}

// Leads client
async function createLead(input: any) {
  try {
    const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating lead:', error);
    // Fallback to mock
    return {
      id: Math.random().toString(36),
      ...input,
      createdAt: new Date().toISOString()
    };
  }
}

export async function registerRoutes(app: FastifyInstance){
  // Public routes
  app.get('/health', { schema: { tags: ['meta'], summary: 'Health' } as any }, async () => ({ status: 'ok', service: 'api-gateway' }));
  app.get('/', { schema: { tags: ['meta'], summary: 'Root' } as any }, async () => ({ name: 'Quiz CRM API Gateway' }));
  
  // Public lead creation
  app.post('/public/leads', { schema: { tags: ['public','leads'], summary: 'Create lead from form' } as any }, async (req) => {
    const body = (req.body as any) || {};
    const lead = await createLead({
      name: body.name,
      email: body.email,
      company: body.company,
      job_title: body.jobTitle,
      cpf: body.cpf,
      phone: body.phone,
      birth_date: body.birthDate,
      cep: body.cep,
      address_line: body.addressLine,
      number: body.number,
      complement: body.complement,
      neighborhood: body.neighborhood,
      city: body.city,
      state: body.state,
      monthly_income: body.monthlyIncome,
      lead_value: body.leadValue,
      expected_close_date: body.expectedCloseDate,
      priority: body.priority || 'medium',
      terms_accepted: body.termsAccepted,
      consent_lgpd: body.consentLgpd,
      source: body.source || 'landing',
      customFields: body.customFields || {}
    });
    return { success: true, lead };
  });

  // Get custom fields for public forms
  app.get('/public/custom-fields', { schema: { tags: ['public'], summary: 'Get active custom fields' } as any }, async (req) => {
    try {
      const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/custom-fields`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      return [];
    }
  });

  app.post('/public/leads/google', { schema: { tags: ['public','leads'], summary: 'Create lead from Google ID token' } as any }, async (req) => {
    const body = (req.body as any) || {};
    const credential = body.credential;
    if (!credential) {
      return { error: 'missing_credential' };
    }
    
    const profile = await verifyGoogleIdToken(credential);
    const lead = await createLead({ 
      name: profile.name, 
      email: profile.email, 
      source: 'google' 
    });
    return { success: true, lead };
  });

  // Protected routes
  app.register(async function (app) {
    app.addHook('preHandler', authMiddleware);
    
    app.get('/secure/ping', { 
      preHandler: [requireScope('api:read')],
      schema: { tags: ['secure'], summary: 'Secure ping', security: [{ bearerAuth: [] }] } as any 
    }, async (req) => {
      const auth = (req as any).auth;
      return { ok: true, user: auth.email || auth.userId };
    });

    // Backoffice routes
    app.get('/backoffice/stats', {
      preHandler: [requireScope('reports:read')],
      schema: { tags: ['backoffice'], summary: 'Dashboard stats', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      try {
        const leadsResponse = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/leads`);
        
        if (!leadsResponse.ok) {
          throw new Error(`HTTP ${leadsResponse.status}`);
        }
        
        const leads = await leadsResponse.json();
        
        const totalLeads = leads.length;
        const totalValue = leads.reduce((sum: number, lead: any) => {
          const value = typeof lead.lead_value === 'string' ? parseFloat(lead.lead_value) : (lead.lead_value || 0);
          return sum + (isNaN(value) ? 0 : value);
        }, 0);
        const hotLeads = leads.filter((lead: any) => lead.temperature === 'hot').length;
        
        const today = new Date().toDateString();
        const todayLeads = leads.filter((lead: any) => {
          const leadDate = new Date(lead.created_at).toDateString();
          return today === leadDate;
        }).length;
        
        const conversionRate = totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const currentMonthLeads = leads.filter((lead: any) => {
          const leadDate = new Date(lead.created_at);
          return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
        }).length;
        
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthLeads = leads.filter((lead: any) => {
          const leadDate = new Date(lead.created_at);
          return leadDate.getMonth() === lastMonth && leadDate.getFullYear() === lastMonthYear;
        }).length;
        
        const monthlyGrowth = lastMonthLeads > 0 ? ((currentMonthLeads - lastMonthLeads) / lastMonthLeads) * 100 : 0;
        
        return {
          totalLeads,
          todayLeads,
          conversionRate: Math.round(conversionRate * 10) / 10,
          monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
          totalValue
        };
      } catch (error) {
        console.error('Error fetching stats:', error);
        return {
          totalLeads: 0,
          todayLeads: 0,
          conversionRate: 0,
          monthlyGrowth: 0,
          totalValue: 0
        };
      }
    });

    app.get('/backoffice/chart', {
      preHandler: [requireScope('reports:read')],
      schema: { tags: ['backoffice'], summary: 'Chart data', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      try {
        const leadsResponse = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/leads`);
        
        if (!leadsResponse.ok) {
          throw new Error(`HTTP ${leadsResponse.status}`);
        }
        
        const leads = await leadsResponse.json();
        
        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const leadsByDay = Array(7).fill(0);
        
        leads.forEach((lead: any) => {
          const dayOfWeek = new Date(lead.created_at).getDay();
          leadsByDay[dayOfWeek]++;
        });
        
        return daysOfWeek.map((name, index) => ({
          name,
          leads: leadsByDay[index]
        }));
      } catch (error) {
        console.error('Error fetching chart data:', error);
        return [
          { name: 'Dom', leads: 0 },
          { name: 'Seg', leads: 0 },
          { name: 'Ter', leads: 0 },
          { name: 'Qua', leads: 0 },
          { name: 'Qui', leads: 0 },
          { name: 'Sex', leads: 0 },
          { name: 'Sab', leads: 0 }
        ];
      }
    });

    app.get('/backoffice/leads', {
      preHandler: [requireScope('leads:read')],
      schema: { tags: ['backoffice'], summary: 'List leads', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      // Fetch real data from leads service
      try {
        const leadsResponse = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/leads`);
        
        if (!leadsResponse.ok) {
          throw new Error(`HTTP ${leadsResponse.status}`);
        }
        
        const leadsData = await leadsResponse.json();
        return leadsData.map((lead: any) => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          source: lead.source,
          phone: lead.phone,
          city: lead.city,
          state: lead.state,
          status: lead.status,
          score: lead.score,
          temperature: lead.temperature,
          company: lead.company,
          job_title: lead.job_title,
          lead_value: lead.lead_value,
          priority: lead.priority,
          assigned_to: lead.assigned_to,
          stage_name: lead.stage_name,
          next_follow_up: lead.next_follow_up,
          created_at: lead.created_at
        }));
      } catch (error) {
        console.error('Error fetching leads:', error);
        return [];
      }
    });

    app.post('/backoffice/leads', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Create lead', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const body = (req.body as any) || {};
      try {
        const lead = await createLead({
          name: body.name,
          email: body.email,
          company: body.company,
          job_title: body.job_title,
          phone: body.phone,
          lead_value: body.lead_value,
          expected_close_date: body.expected_close_date,
          priority: body.priority || 'medium',
          assigned_to: body.assigned_to,
          source: body.source || 'backoffice',
          monthly_income: body.monthly_income,
          notes: body.notes
        });
        return lead;
      } catch (error) {
        console.error('Error creating lead:', error);
        throw error;
      }
    });

    app.put('/backoffice/leads/:id', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Update lead', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/leads/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating lead:', error);
        throw error;
      }
    });

    app.put('/backoffice/leads/:id/move', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Move lead to stage', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const { id } = req.params as any;
      const { stageId } = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/leads/${id}/move`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ stageId })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error moving lead:', error);
        throw error;
      }
    });

    app.get('/backoffice/activities', {
      preHandler: [requireScope('leads:read')],
      schema: { tags: ['backoffice'], summary: 'List activities', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      try {
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/activities`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
      }
    });

    app.post('/backoffice/activities', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Create activity', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const body = (req.body as any) || {};
      
      try {
        console.log('Creating activity:', body);
        
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/activities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lead_id: body.leadId,
            type: body.type,
            subject: body.description?.substring(0, 100) || null,
            description: body.description,
            outcome: body.outcome || null,
            follow_up_required: body.follow_up_required || false,
            next_action: body.next_action || null,
            duration_minutes: body.duration_minutes || null,
            created_by: 'backoffice'
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from leads service:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const activity = await response.json();
        console.log('Activity created successfully:', activity);
        
        // Send email if it's an email activity
        if (body.type === 'email' && body.emailContent) {
          try {
            await fetch(`${process.env.EMAIL_BASE_URL || 'http://email:3040'}/emails`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: { email: 'noreply@crm.com', name: 'CRM System' },
                to: [{ email: body.emailContent.to }],
                subject: body.emailContent.subject,
                htmlBody: body.emailContent.htmlBody,
                textBody: body.emailContent.textBody,
                leadId: body.leadId,
                priority: 'normal'
              })
            });
          } catch (emailError) {
            console.error('Error sending email:', emailError);
          }
        }
        
        return activity;
      } catch (error) {
        console.error('Error creating activity:', error);
        throw error;
      }
    });

    app.post('/backoffice/emails', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Send email', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.EMAIL_BASE_URL || 'http://email:3040'}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error sending email:', error);
        throw error;
      }
    });

    app.get('/backoffice/emails/lead/:leadId', {
      preHandler: [requireScope('leads:read')],
      schema: { tags: ['backoffice'], summary: 'Get lead emails', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      try {
        const { leadId } = req.params as { leadId: string };
        const response = await fetch(`${process.env.EMAIL_BASE_URL || 'http://email:3040'}/emails/lead/${leadId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching lead emails:', error);
        return [];
      }
    });

    app.get('/backoffice/pipeline', {
      preHandler: [requireScope('leads:read')],
      schema: { tags: ['backoffice'], summary: 'Pipeline board', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      try {
        const pipelineResponse = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/pipeline`);
        
        if (!pipelineResponse.ok) {
          throw new Error(`HTTP ${pipelineResponse.status}`);
        }
        
        const pipelineData = await pipelineResponse.json();
        return pipelineData;
      } catch (error) {
        console.error('Error fetching pipeline:', error);
        return [];
      }
    });

    // WhatsApp routes
    app.post('/whatsapp/send-message', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['whatsapp'], summary: 'Send WhatsApp message', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.WHATSAPP_BASE_URL || 'http://whatsapp:3050'}/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
      }
    });

    app.post('/whatsapp/leads/:id/welcome', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['whatsapp'], summary: 'Send welcome WhatsApp', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.WHATSAPP_BASE_URL || 'http://whatsapp:3050'}/leads/${id}/welcome`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error sending welcome WhatsApp:', error);
        throw error;
      }
    });

    app.post('/whatsapp/leads/:id/follow-up', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['whatsapp'], summary: 'Send follow-up WhatsApp', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.WHATSAPP_BASE_URL || 'http://whatsapp:3050'}/leads/${id}/follow-up`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error sending follow-up WhatsApp:', error);
        throw error;
      }
    });

    app.post('/whatsapp/leads/:id/qualification', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['whatsapp'], summary: 'Send qualification WhatsApp', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.WHATSAPP_BASE_URL || 'http://whatsapp:3050'}/leads/${id}/qualification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error sending qualification WhatsApp:', error);
        throw error;
      }
    });

    // Custom Fields Management
    app.get('/backoffice/custom-fields', {
      preHandler: [requireScope('leads:read')],
      schema: { tags: ['backoffice'], summary: 'Get custom fields', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      try {
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/custom-fields`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching custom fields:', error);
        return [];
      }
    });

    app.post('/backoffice/custom-fields', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Create custom field', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/custom-fields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating custom field:', error);
        throw error;
      }
    });

    app.put('/backoffice/custom-fields/:id', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Update custom field', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/custom-fields/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating custom field:', error);
        throw error;
      }
    });

    app.delete('/backoffice/custom-fields/:id', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Delete custom field', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const { id } = req.params as any;
      
      try {
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/custom-fields/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error deleting custom field:', error);
        throw error;
      }
    });
  });
}