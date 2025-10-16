import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'db',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'quiz',
  user: process.env.POSTGRES_USER || 'quiz',
  password: process.env.POSTGRES_PASSWORD || 'quiz',
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

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
      
      const query = `
        INSERT INTO leads (
          name, email, phone, cpf, birth_date, cep, address_line, number, 
          complement, neighborhood, city, state, monthly_income, source, 
          terms_accepted, consent_lgpd, status, score, temperature
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *
      `;
      
      const values = [
        body.name,
        body.email,
        body.phone || null,
        body.cpf || null,
        body.birthDate || null,
        body.cep || null,
        body.addressLine || null,
        body.number || null,
        body.complement || null,
        body.neighborhood || null,
        body.city || null,
        body.state || null,
        body.monthlyIncome || null,
        body.source || 'unknown',
        body.termsAccepted || false,
        body.consentLgpd || false,
        'new',
        50, // default score
        'cold' // default temperature
      ];

      const result = await pool.query(query, values);
      const lead = result.rows[0];

      // Add to default pipeline
      const pipelineQuery = `
        INSERT INTO lead_pipeline (lead_id, pipeline_id, current_stage_id)
        SELECT $1, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'
        WHERE NOT EXISTS (
          SELECT 1 FROM lead_pipeline WHERE lead_id = $1
        )
      `;
      await pool.query(pipelineQuery, [lead.id]);

      reply.code(201);
      return {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        source: lead.source,
        status: lead.status,
        created_at: lead.created_at
      };
    } catch (error: any) {
      app.log.error(error);
      
      if (error.code === '23505') { // unique violation
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
      const query = `
        SELECT 
          l.*,
          s.name as stage_name,
          p.name as pipeline_name
        FROM leads l
        LEFT JOIN lead_pipeline lp ON l.id = lp.lead_id
        LEFT JOIN stages s ON lp.current_stage_id = s.id
        LEFT JOIN pipelines p ON lp.pipeline_id = p.id
        ORDER BY l.created_at DESC
        LIMIT 100
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error: any) {
      app.log.error(error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Get all activities (for backoffice)
  app.get('/activities', async (req, reply) => {
    try {
      const query = `
        SELECT 
          a.*,
          l.name as lead_name,
          l.email as lead_email
        FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        ORDER BY a.created_at DESC
        LIMIT 100
      `;
      
      const result = await pool.query(query);
      return result.rows;
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
      
      const query = `
        SELECT 
          l.*,
          s.name as stage_name,
          p.name as pipeline_name
        FROM leads l
        LEFT JOIN lead_pipeline lp ON l.id = lp.lead_id
        LEFT JOIN stages s ON lp.current_stage_id = s.id
        LEFT JOIN pipelines p ON lp.pipeline_id = p.id
        WHERE l.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
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

  // Update lead
  app.put('/leads/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      // Build dynamic update query
      const allowedFields = [
        'name', 'email', 'phone', 'company', 'job_title', 
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
      
      const query = `
        UPDATE leads 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
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
      
      const query = `
        SELECT * FROM stages 
        WHERE pipeline_id = $1 
        ORDER BY order_no
      `;
      
      const result = await pool.query(query, [id]);
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
      const query = `
        SELECT * FROM pipelines 
        WHERE is_active = true
        ORDER BY created_at
      `;
      
      const result = await pool.query(query);
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
      
      const query = `
        SELECT 
          a.*,
          l.name as lead_name
        FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        WHERE a.lead_id = $1 
        ORDER BY a.created_at DESC
      `;
      
      const result = await pool.query(query, [id]);
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
      
      const query = `
        INSERT INTO activities (
          lead_id, type, subject, description, outcome, 
          duration_minutes, follow_up_required, next_action, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        id,
        body.type,
        body.subject || body.description?.substring(0, 100) || null,
        body.description || null,
        body.outcome || null,
        body.duration_minutes || null,
        body.follow_up_required || false,
        body.next_action || null,
        body.created_by || 'system'
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

  // Create activity (general endpoint)
  app.post('/activities', async (req, reply) => {
    try {
      const body = req.body as any;
      
      const query = `
        INSERT INTO activities (
          lead_id, type, subject, description, outcome, 
          duration_minutes, follow_up_required, next_action, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        body.lead_id,
        body.type,
        body.subject || body.description?.substring(0, 100) || null,
        body.description || null,
        body.outcome || null,
        body.duration_minutes || null,
        body.follow_up_required || false,
        body.next_action || null,
        body.created_by || 'system'
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

  // Get pipeline board data for backoffice
  app.get('/pipeline', async (req, reply) => {
    try {
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
        LEFT JOIN leads l ON lp.lead_id = l.id
        WHERE s.pipeline_id = '550e8400-e29b-41d4-a716-446655440000'
        GROUP BY s.id, s.name, s.order_no, s.stage_color
        ORDER BY s.order_no
      `;
      
      const result = await pool.query(query);
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
      
      const query = `
        UPDATE lead_pipeline 
        SET current_stage_id = $1, updated_at = now()
        WHERE lead_id = $2
        RETURNING *
      `;
      
      const result = await pool.query(query, [stageId, id]);
      
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
}