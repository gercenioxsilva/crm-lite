export function leadRow(overrides: Record<string, any> = {}) {
  return {
    id: 'lead-1',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Lead Teste',
    email: 'lead@example.com',
    phone: null,
    company: null,
    job_title: null,
    document: null,
    document_type: 'cpf',
    birth_date: null,
    cep: null,
    address_line: null,
    number: null,
    complement: null,
    neighborhood: null,
    city: null,
    state: null,
    monthly_income: null,
    lead_value: null,
    expected_close_date: null,
    priority: null,
    assigned_to: null,
    source: 'test',
    status: 'new',
    score: 50,
    temperature: 'cold',
    terms_accepted: false,
    consent_lgpd: false,
    stage_id: null,
    next_follow_up: null,
    metadata: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    stage_name: null,
    pipeline_name: null,
    ...overrides,
  };
}

const drizzleLeadColumns = [
  'id',
  'tenant_id',
  'name',
  'email',
  'phone',
  'company',
  'job_title',
  'document',
  'document_type',
  'birth_date',
  'cep',
  'address_line',
  'number',
  'complement',
  'neighborhood',
  'city',
  'state',
  'monthly_income',
  'lead_value',
  'expected_close_date',
  'priority',
  'assigned_to',
  'source',
  'status',
  'score',
  'temperature',
  'terms_accepted',
  'consent_lgpd',
  'stage_id',
  'next_follow_up',
  'metadata',
  'created_at',
  'updated_at',
  'stage_name',
  'pipeline_name',
];

export function drizzleLeadRows(rows: Array<Record<string, any>>) {
  return {
    rows: rows.map((row) => drizzleLeadColumns.map((column) => row[column] ?? null)),
  };
}

export function activityRow(overrides: Record<string, any> = {}) {
  return {
    id: 'activity-1',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    lead_id: 'lead-1',
    type: 'email',
    subject: 'Contato inicial',
    description: 'Mensagem enviada ao lead',
    outcome: null,
    duration_minutes: null,
    follow_up_required: false,
    next_action: null,
    created_by: 'system',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const drizzleActivityColumns = [
  'id',
  'tenant_id',
  'lead_id',
  'type',
  'subject',
  'description',
  'outcome',
  'duration_minutes',
  'follow_up_required',
  'next_action',
  'created_by',
  'created_at',
  'updated_at',
];

export function drizzleActivityRows(rows: Array<Record<string, any>>) {
  return {
    rows: rows.map((row) => drizzleActivityColumns.map((column) => row[column] ?? null)),
  };
}
