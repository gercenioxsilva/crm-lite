import { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { db, pool } from '../../db/client';
import { activities, leadPipeline, leads, pipelines, stages } from '../../db/schema';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const ALLOWED_ACTIVITY_OUTCOMES = new Set([
  'interested',
  'not_interested',
  'callback',
  'meeting_scheduled',
  'no_answer',
  'completed',
  'sent',
  'opened',
  'clicked',
]);
const ALLOWED_ACTIVITY_TYPES = new Set(['call', 'email', 'meeting', 'whatsapp', 'sms', 'note', 'task']);

function tenantIdFromRequest(req: any, _required = true): string {
  const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
  if (typeof tenantId === 'string' && tenantId.trim()) return tenantId;
  return DEFAULT_TENANT_ID;
}

function normalizeActivityOutcome(outcome: unknown): string | null {
  if (typeof outcome !== 'string') return null;
  const value = outcome.trim();
  return ALLOWED_ACTIVITY_OUTCOMES.has(value) ? value : null;
}

function normalizeActivityType(type: unknown): string {
  if (typeof type !== 'string') return 'note';
  const value = type.trim();
  return ALLOWED_ACTIVITY_TYPES.has(value) ? value : 'note';
}

function isActivityConstraintViolation(error: any): boolean {
  let current = error;
  while (current) {
    const constraint = current.constraint || '';
    if (current.code === '23514' && String(constraint).startsWith('chk_activity_')) {
      return true;
    }
    current = current.cause;
  }

  return false;
}

async function insertActivity(values: any, log: FastifyInstance['log']) {
  try {
    const [activity] = await db.insert(activities).values(values).returning();
    return activity;
  } catch (error: any) {
    if (isActivityConstraintViolation(error)) {
      log.warn(
        { error, lead_id: values.lead_id, type: values.type, outcome: values.outcome },
        'Retrying activity insert with safe constraint-compatible values'
      );

      const [activity] = await db.insert(activities).values({
        ...values,
        type: normalizeActivityType(values.type),
        outcome: 'completed',
      }).returning();
      return activity;
    }

    throw error;
  }
}

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', service: 'leads', database: 'connected', timestamp: new Date().toISOString() };
    } catch (error: any) {
      return { status: 'error', service: 'leads', database: 'disconnected', error: error.message, timestamp: new Date().toISOString() };
    }
  });

  // Public route for creating leads (no auth required)
  app.post('/leads', async (req, reply) => {
    try {
      const body = req.body as any;
      const tenantId = tenantIdFromRequest(req, false);
      
      // Aceita tanto o campo novo (document/document_type) quanto o legado (cpf)
      const document = body.document || body.cpf || null;
      const documentType = body.document_type || (body.cpf ? 'cpf' : 'cpf');

      const [lead] = await db.insert(leads).values({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        company: body.company || null,
        job_title: body.job_title || null,
        document,
        document_type: documentType,
        birth_date: body.birthDate || null,
        cep: body.cep || null,
        address_line: body.addressLine || null,
        number: body.number || null,
        complement: body.complement || null,
        neighborhood: body.neighborhood || null,
        city: body.city || null,
        state: body.state || null,
        monthly_income: body.monthlyIncome != null ? String(body.monthlyIncome) : null,
        lead_value: body.lead_value != null ? String(body.lead_value) : null,
        expected_close_date: body.expected_close_date || null,
        priority: body.priority || 'medium',
        assigned_to: body.assigned_to || null,
        source: body.source || 'unknown',
        terms_accepted: body.termsAccepted || false,
        consent_lgpd: body.consentLgpd || false,
        status: 'new',
        score: 50,
        temperature: 'cold',
        tenant_id: tenantId,
      }).returning();

      // Add to default pipeline
      const pipelineQuery = `
        INSERT INTO lead_pipeline (lead_id, pipeline_id, current_stage_id)
        SELECT $1, p.id, s.id
        FROM pipelines p
        JOIN stages s ON s.pipeline_id = p.id AND s.order_no = 1 AND s.tenant_id = p.tenant_id
        WHERE p.tenant_id = $2 AND p.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM lead_pipeline WHERE lead_id = $1
        )
        ORDER BY p.created_at
        LIMIT 1
      `;
      await pool.query(pipelineQuery, [lead.id, tenantId]);

      // Save custom field values
      if (body.customFields && typeof body.customFields === 'object') {
        for (const [fieldName, fieldValue] of Object.entries(body.customFields)) {
          if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
            const customFieldQuery = `
              INSERT INTO lead_custom_values (lead_id, custom_field_id, value)
              SELECT $1, cf.id, $2
              FROM custom_fields cf
              WHERE cf.name = $3 AND cf.tenant_id = $4 AND cf.is_active = true
              ON CONFLICT (lead_id, custom_field_id) 
              DO UPDATE SET value = $2, updated_at = now()
            `;
            await pool.query(customFieldQuery, [lead.id, String(fieldValue), fieldName, tenantId]);
          }
        }
      }

      reply.code(201);
      return {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        source: lead.source,
        status: lead.status,
        created_at: lead.created_at,
        custom_fields_saved: body.customFields ? Object.keys(body.customFields).length : 0
      };
    } catch (error: any) {
      app.log.error(error);
      
      if (error.code === '23505' || error.cause?.code === '23505') { // unique violation
        reply.code(409);
        return { error: 'Email already exists' };
      }
      
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Get all leads (public for development)
  app.get('/leads', async (req, reply) => {
    try {
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }

      return await db
        .select({
          id: leads.id,
          tenant_id: leads.tenant_id,
          name: leads.name,
          email: leads.email,
          phone: leads.phone,
          company: leads.company,
          job_title: leads.job_title,
          document: leads.document,
          document_type: leads.document_type,
          birth_date: leads.birth_date,
          cep: leads.cep,
          address_line: leads.address_line,
          number: leads.number,
          complement: leads.complement,
          neighborhood: leads.neighborhood,
          city: leads.city,
          state: leads.state,
          monthly_income: leads.monthly_income,
          lead_value: leads.lead_value,
          expected_close_date: leads.expected_close_date,
          priority: leads.priority,
          assigned_to: leads.assigned_to,
          source: leads.source,
          status: leads.status,
          score: leads.score,
          temperature: leads.temperature,
          terms_accepted: leads.terms_accepted,
          consent_lgpd: leads.consent_lgpd,
          stage_id: leads.stage_id,
          next_follow_up: leads.next_follow_up,
          metadata: leads.metadata,
          created_at: leads.created_at,
          updated_at: leads.updated_at,
          stage_name: stages.name,
          pipeline_name: pipelines.name,
        })
        .from(leads)
        .leftJoin(leadPipeline, eq(leads.id, leadPipeline.lead_id))
        .leftJoin(stages, eq(leadPipeline.current_stage_id, stages.id))
        .leftJoin(pipelines, eq(leadPipeline.pipeline_id, pipelines.id))
        .where(eq(leads.tenant_id, tenantId))
        .orderBy(desc(leads.created_at))
        .limit(100);
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Get all activities (for backoffice)
  app.get('/activities', async (req, reply) => {
    try {
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }

      return await db
        .select({
          id: activities.id,
          tenant_id: activities.tenant_id,
          lead_id: activities.lead_id,
          type: activities.type,
          subject: activities.subject,
          description: activities.description,
          outcome: activities.outcome,
          duration_minutes: activities.duration_minutes,
          follow_up_required: activities.follow_up_required,
          next_action: activities.next_action,
          created_by: activities.created_by,
          created_at: activities.created_at,
          updated_at: activities.updated_at,
          lead_name: leads.name,
          lead_email: leads.email,
        })
        .from(activities)
        .leftJoin(leads, eq(activities.lead_id, leads.id))
        .where(eq(activities.tenant_id, tenantId))
        .orderBy(desc(activities.created_at))
        .limit(100);
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Get lead by ID
  app.get('/leads/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const result = await db
        .select({
          id: leads.id,
          tenant_id: leads.tenant_id,
          name: leads.name,
          email: leads.email,
          phone: leads.phone,
          company: leads.company,
          job_title: leads.job_title,
          document: leads.document,
          document_type: leads.document_type,
          birth_date: leads.birth_date,
          cep: leads.cep,
          address_line: leads.address_line,
          number: leads.number,
          complement: leads.complement,
          neighborhood: leads.neighborhood,
          city: leads.city,
          state: leads.state,
          monthly_income: leads.monthly_income,
          lead_value: leads.lead_value,
          expected_close_date: leads.expected_close_date,
          priority: leads.priority,
          assigned_to: leads.assigned_to,
          source: leads.source,
          status: leads.status,
          score: leads.score,
          temperature: leads.temperature,
          terms_accepted: leads.terms_accepted,
          consent_lgpd: leads.consent_lgpd,
          stage_id: leads.stage_id,
          next_follow_up: leads.next_follow_up,
          metadata: leads.metadata,
          created_at: leads.created_at,
          updated_at: leads.updated_at,
          stage_name: stages.name,
          pipeline_name: pipelines.name,
        })
        .from(leads)
        .leftJoin(leadPipeline, eq(leads.id, leadPipeline.lead_id))
        .leftJoin(stages, eq(leadPipeline.current_stage_id, stages.id))
        .leftJoin(pipelines, eq(leadPipeline.pipeline_id, pipelines.id))
        .where(and(eq(leads.id, id), eq(leads.tenant_id, tenantId)))
        .limit(1);

      if (result.length === 0) {
        reply.code(404);
        return { error: 'Lead not found' };
      }
      
      return result[0];
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Update lead
  app.put('/leads/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      // Build dynamic update query
      const allowedFields = [
        'name', 'email', 'phone', 'company', 'job_title',
        'document', 'document_type',
        'lead_value', 'priority', 'assigned_to', 'next_follow_up',
        'temperature', 'score', 'status'
      ];
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateFields.push(`${field} = $${paramCount}`);
          values.push(body[field]);
          paramCount++;
        }
      }
      
      if (updateFields.length === 0) {
        reply.code(400);
        return { error: 'No valid fields to update' };
      }
      
      updateFields.push(`updated_at = now()`);
      values.push(id);
      values.push(tenantId);
      
      const query = `
        UPDATE leads 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'Lead not found' };
      }
      
      return result.rows[0];
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Get pipeline stages
  app.get('/pipelines/:id/stages', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const query = `
        SELECT * FROM stages 
        WHERE pipeline_id = $1 AND tenant_id = $2
        ORDER BY order_no
      `;
      
      const result = await pool.query(query, [id, tenantId]);
      return result.rows;
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Get all pipelines
  app.get('/pipelines', async (req, reply) => {
    try {
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }

      const query = `
        SELECT * FROM pipelines 
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY created_at
      `;
      
      const result = await pool.query(query, [tenantId]);
      return result.rows;
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Get lead activities
  app.get('/leads/:id/activities', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const query = `
        SELECT 
          a.*,
          l.name as lead_name
        FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        WHERE a.lead_id = $1 AND a.tenant_id = $2
        ORDER BY a.created_at DESC
      `;
      
      const result = await pool.query(query, [id, tenantId]);
      return result.rows;
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Add activity to lead
  app.post('/leads/:id/activities', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }

      const leadExists = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.id, id), eq(leads.tenant_id, tenantId)))
        .limit(1);

      if (leadExists.length === 0) {
        reply.code(404);
        return { error: 'Lead not found' };
      }

      const activity = await insertActivity({
        lead_id: id,
        type: normalizeActivityType(body.type),
        subject: body.subject || body.description?.substring(0, 100) || null,
        description: body.description || null,
        outcome: normalizeActivityOutcome(body.outcome),
        duration_minutes: body.duration_minutes || null,
        follow_up_required: body.follow_up_required || false,
        next_action: body.next_action || null,
        created_by: body.created_by || 'system',
        tenant_id: tenantId,
      }, app.log);

      reply.code(201);
      return activity;
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return {
        code: 'CRM_ACTIVITY_CREATE_FAILED',
        error: 'Unable to create activity',
        message: 'Todo mundo erra dessa vez, foi os nossos engenheiros.',
        details: error.message,
      };
    }
  });

  // Create activity (general endpoint)
  app.post('/activities', async (req, reply) => {
    try {
      const body = req.body as any;
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }

      const leadExists = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.id, body.lead_id), eq(leads.tenant_id, tenantId)))
        .limit(1);

      if (leadExists.length === 0) {
        reply.code(404);
        return { error: 'Lead not found' };
      }

      const activity = await insertActivity({
        lead_id: body.lead_id,
        type: normalizeActivityType(body.type),
        subject: body.subject || body.description?.substring(0, 100) || null,
        description: body.description || null,
        outcome: normalizeActivityOutcome(body.outcome),
        duration_minutes: body.duration_minutes || null,
        follow_up_required: body.follow_up_required || false,
        next_action: body.next_action || null,
        created_by: body.created_by || 'system',
        tenant_id: tenantId,
      }, app.log);

      reply.code(201);
      return activity;
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return {
        code: 'CRM_ACTIVITY_CREATE_FAILED',
        error: 'Unable to create activity',
        message: 'Todo mundo erra dessa vez, foi os nossos engenheiros.',
        details: error.message,
      };
    }
  });

  // Get pipeline board data for backoffice
  app.get('/pipeline', async (req, reply) => {
    try {
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }

      const query = `
        SELECT 
          s.id,
          s.name,
          s.order_no,
          s.stage_color,
          COALESCE(
            json_agg(
              json_build_object(
                'id', l.id,
                'name', l.name,
                'email', l.email,
                'company', l.company,
                'job_title', l.job_title,
                'lead_value', l.lead_value,
                'priority', l.priority,
                'assigned_to', l.assigned_to,
                'stage_name', s.name,
                'temperature', l.temperature,
                'next_follow_up', l.next_follow_up
              ) ORDER BY l.created_at DESC
            ) FILTER (WHERE l.id IS NOT NULL),
            '[]'
          ) as leads
        FROM stages s
        LEFT JOIN lead_pipeline lp ON s.id = lp.current_stage_id
        LEFT JOIN leads l ON lp.lead_id = l.id AND l.tenant_id = $1
        WHERE s.pipeline_id = '550e8400-e29b-41d4-a716-446655440000'
          AND s.tenant_id = $1
        GROUP BY s.id, s.name, s.order_no, s.stage_color
        ORDER BY s.order_no
      `;
      
      const result = await pool.query(query, [tenantId]);
      return result.rows;
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Update lead stage
  app.put('/leads/:id/move', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { stageId } = req.body as any;
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const query = `
        UPDATE lead_pipeline 
        SET current_stage_id = $1, updated_at = now()
        WHERE lead_id = $2
          AND EXISTS (
            SELECT 1 FROM leads l
            WHERE l.id = lead_pipeline.lead_id AND l.tenant_id = $3
          )
          AND EXISTS (
            SELECT 1 FROM stages s
            WHERE s.id = $1 AND s.tenant_id = $3
          )
        RETURNING *
      `;
      
      const result = await pool.query(query, [stageId, id, tenantId]);
      
      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'Lead not found in pipeline' };
      }
      
      return { success: true, leadId: id, stageId };
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Custom Fields Management
  app.get('/custom-fields', async (req, reply) => {
    try {
      const tenantId = tenantIdFromRequest(req, false);
      console.log('Fetching custom fields...');
      const result = await pool.query(`
        SELECT id, name, label, field_type, is_required, placeholder, 
               help_text, options, validation_rules, display_order, is_active
        FROM custom_fields 
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY display_order, created_at
      `, [tenantId]);
      console.log('Custom fields result:', result.rows.length, 'fields found');
      return result.rows;
    } catch (error: any) {
      console.error('Custom fields error:', error);
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error', details: error.message };
    }
  });

  app.post('/custom-fields', async (req, reply) => {
    try {
      const body = req.body as any;
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const query = `
        INSERT INTO custom_fields (
          name, label, field_type, is_required, placeholder, 
          help_text, options, validation_rules, display_order, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        body.name,
        body.label,
        body.field_type,
        body.is_required || false,
        body.placeholder || null,
        body.help_text || null,
        body.options || null,
        body.validation_rules || null,
        body.display_order || 0,
        tenantId
      ];
      
      const result = await pool.query(query, values);
      reply.code(201);
      return result.rows[0];
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  app.put('/custom-fields/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const query = `
        UPDATE custom_fields 
        SET label = $1, field_type = $2, is_required = $3, 
            placeholder = $4, help_text = $5, options = $6, 
            validation_rules = $7, display_order = $8, updated_at = now()
        WHERE id = $9 AND tenant_id = $10
        RETURNING *
      `;
      
      const values = [
        body.label,
        body.field_type,
        body.is_required,
        body.placeholder,
        body.help_text,
        body.options,
        body.validation_rules,
        body.display_order,
        id,
        tenantId
      ];
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'Custom field not found' };
      }
      
      return result.rows[0];
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  app.delete('/custom-fields/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const query = `
        UPDATE custom_fields 
        SET is_active = false, updated_at = now()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;
      
      const result = await pool.query(query, [id, tenantId]);
      
      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'Custom field not found' };
      }
      
      return { success: true };
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Get lead with custom values
  app.get('/leads/:id/custom-values', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tenantId = tenantIdFromRequest(req);
      if (!tenantId) {
        reply.code(400);
        return { error: 'Tenant header is required' };
      }
      
      const query = `
        SELECT 
          cf.name,
          cf.label,
          cf.field_type,
          lcv.value
        FROM custom_fields cf
        LEFT JOIN lead_custom_values lcv ON cf.id = lcv.custom_field_id AND lcv.lead_id = $1
        WHERE cf.tenant_id = $2 AND cf.is_active = true
        ORDER BY cf.display_order
      `;
      
      const result = await pool.query(query, [id, tenantId]);
      return result.rows;
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });
}
