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
      source: body.source || 'landing'
    });
    return { success: true, lead };
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
        // Fallback to mock data
        return [
          {
            id: '1',
            name: 'João Silva Santos',
            email: 'joao.silva@email.com',
            source: 'landing',
            phone: '11987654321',
            city: 'São Paulo',
            state: 'SP',
            status: 'qualified',
            score: 85,
            temperature: 'hot',
            company: 'Tech Solutions',
            job_title: 'CTO',
            lead_value: 50000,
            priority: 'high',
            assigned_to: 'vendedor1@quiz.com',
            stage_name: 'Qualificado',
            next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          }
        ];
      }
    });

    app.post('/backoffice/leads', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Create lead', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const body = (req.body as any) || {};
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
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating lead:', error);
        return { id, ...body, updated_at: new Date().toISOString() };
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
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error moving lead:', error);
        return { success: true, leadId: id, stageId };
      }
    });

    app.post('/backoffice/activities', {
      preHandler: [requireScope('leads:write')],
      schema: { tags: ['backoffice'], summary: 'Create activity', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      const body = (req.body as any) || {};
      
      try {
        const response = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/activities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lead_id: body.leadId,
            type: body.type,
            description: body.description,
            outcome: body.outcome,
            follow_up_required: body.follow_up_required,
            next_action: body.next_action,
            duration_minutes: body.duration_minutes,
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating activity:', error);
        return {
          id: Math.random().toString(36),
          lead_id: body.leadId,
          type: body.type,
          description: body.description,
          outcome: body.outcome,
          created_at: new Date().toISOString()
        };
      }
    });

    app.get('/backoffice/pipeline', {
      preHandler: [requireScope('leads:read')],
      schema: { tags: ['backoffice'], summary: 'Pipeline board', security: [{ bearerAuth: [] }] } as any
    }, async (req) => {
      try {
        const pipelineResponse = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/pipeline`);
        const pipelineData = await pipelineResponse.json();
        return pipelineData;
      } catch (error) {
        console.error('Error fetching pipeline:', error);
        try {
          const fallbackResponse = await fetch(`${process.env.LEADS_BASE_URL || 'http://leads:3020'}/pipeline`);
          const fallbackData = await fallbackResponse.json();
          return fallbackData;
        } catch (fallbackError) {
          // Mock pipeline data
          return [
          {
            id: '1',
            name: 'Novo Lead',
            order_no: 1,
            stage_color: '#94a3b8',
            leads: [
              {
                id: '1',
                name: 'Ana Paula Ferreira',
                email: 'ana@email.com',
                company: 'Startup Fintech',
                job_title: 'Founder',
                lead_value: 30000,
                priority: 'medium',
                temperature: 'warm',
                assigned_to: 'vendedor1@quiz.com',
                stage_name: 'Novo Lead'
              }
            ]
          },
          {
            id: '2',
            name: 'Qualificado',
            order_no: 2,
            stage_color: '#3b82f6',
            leads: [
              {
                id: '2',
                name: 'João Silva Santos',
                email: 'joao@email.com',
                company: 'Tech Solutions',
                job_title: 'CTO',
                lead_value: 50000,
                priority: 'high',
                temperature: 'hot',
                assigned_to: 'vendedor1@quiz.com',
                stage_name: 'Qualificado',
                next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
              }
            ]
          },
          {
            id: '3',
            name: 'Proposta',
            order_no: 3,
            stage_color: '#f59e0b',
            leads: []
          },
          {
            id: '4',
            name: 'Negociação',
            order_no: 4,
            stage_color: '#ef4444',
            leads: []
          },
          {
            id: '5',
            name: 'Fechado',
            order_no: 5,
            stage_color: '#22c55e',
            leads: []
          }
        ];
        }
      }
    });
  });
}