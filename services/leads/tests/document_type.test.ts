const mockPool = {
  query: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

import { buildServer } from '../src/infrastructure/server';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const baseLead = {
  id: 'lead-1',
  name: 'Empresa Teste',
  email: 'contato@empresa.com',
  source: 'test',
  status: 'new',
  created_at: '2026-01-01T00:00:00.000Z'
};

describe('Leads API - document / document_type', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('cria lead CPF com campo document e document_type cpf', async () => {
    const lead = { ...baseLead, document: '123.456.789-00', document_type: 'cpf' };

    mockPool.query
      .mockResolvedValueOnce({ rows: [lead] })  // INSERT leads
      .mockResolvedValueOnce({ rows: [] });      // INSERT lead_pipeline

    const app = buildServer();
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        name: 'Empresa Teste',
        email: 'contato@empresa.com',
        document: '123.456.789-00',
        document_type: 'cpf',
        source: 'test',
        termsAccepted: true,
        consentLgpd: true
      }
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: 'lead-1', email: 'contato@empresa.com' });

    const insertCall = mockPool.query.mock.calls[0];
    const sql: string = insertCall[0];
    const params: any[] = insertCall[1];

    expect(sql).toContain('document');
    expect(sql).toContain('document_type');
    expect(params).toContain('123.456.789-00');
    expect(params).toContain('cpf');

    await app.close();
  });

  it('cria lead CNPJ com campo document e document_type cnpj', async () => {
    const lead = { ...baseLead, document: '12.345.678/0001-90', document_type: 'cnpj', company: 'Empresa S.A.' };

    mockPool.query
      .mockResolvedValueOnce({ rows: [lead] })
      .mockResolvedValueOnce({ rows: [] });

    const app = buildServer();
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        name: 'Empresa S.A.',
        email: 'contato@empresa.com',
        document: '12.345.678/0001-90',
        document_type: 'cnpj',
        company: 'Empresa S.A.',
        source: 'backoffice',
        termsAccepted: true,
        consentLgpd: true
      }
    });

    expect(res.statusCode).toBe(201);

    const insertCall = mockPool.query.mock.calls[0];
    const params: any[] = insertCall[1];

    expect(params).toContain('12.345.678/0001-90');
    expect(params).toContain('cnpj');

    await app.close();
  });

  it('compatibilidade retroativa: campo cpf mapeia para document com document_type cpf', async () => {
    const lead = { ...baseLead, document: '987.654.321-00', document_type: 'cpf' };

    mockPool.query
      .mockResolvedValueOnce({ rows: [lead] })
      .mockResolvedValueOnce({ rows: [] });

    const app = buildServer();
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        name: 'Empresa Teste',
        email: 'contato@empresa.com',
        cpf: '987.654.321-00',
        source: 'test',
        termsAccepted: true
      }
    });

    expect(res.statusCode).toBe(201);

    const insertCall = mockPool.query.mock.calls[0];
    const params: any[] = insertCall[1];

    expect(params).toContain('987.654.321-00');
    expect(params).toContain('cpf');

    await app.close();
  });

  it('listagem retorna campos document e document_type', async () => {
    const leads = [
      { ...baseLead, document: '11.222.333/0001-44', document_type: 'cnpj' },
      { ...baseLead, id: 'lead-2', email: 'b@test.com', document: '111.222.333-44', document_type: 'cpf' }
    ];

    mockPool.query.mockResolvedValueOnce({ rows: leads });

    const app = buildServer();
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/leads',
      headers: { 'x-tenant-id': TENANT_ID }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({ document_type: 'cnpj', document: '11.222.333/0001-44' });
    expect(body[1]).toMatchObject({ document_type: 'cpf',  document: '111.222.333-44' });

    await app.close();
  });

  it('atualiza document e document_type via PUT', async () => {
    const updated = { ...baseLead, document: '99.888.777/0001-66', document_type: 'cnpj' };

    mockPool.query.mockResolvedValueOnce({ rows: [updated] });

    const app = buildServer();
    await app.ready();

    const res = await app.inject({
      method: 'PUT',
      url: '/leads/lead-1',
      headers: { 'x-tenant-id': TENANT_ID },
      payload: { document: '99.888.777/0001-66', document_type: 'cnpj' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ document: '99.888.777/0001-66', document_type: 'cnpj' });

    const updateCall = mockPool.query.mock.calls[0];
    const sql: string = updateCall[0];
    expect(sql).toContain('document');
    expect(sql).toContain('document_type');

    await app.close();
  });

  it('retorna 409 em email duplicado no mesmo tenant', async () => {
    mockPool.query.mockRejectedValueOnce({ code: '23505' });

    const app = buildServer();
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/leads',
      headers: { 'x-tenant-id': TENANT_ID },
      payload: {
        name: 'Empresa Teste',
        email: 'duplicado@empresa.com',
        document_type: 'cnpj',
        document: '00.000.000/0001-00',
        source: 'test'
      }
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'Email already exists' });

    await app.close();
  });
});
