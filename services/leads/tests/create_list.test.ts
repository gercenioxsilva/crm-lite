const mockPool = {
  query: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

import { buildServer } from '../src/infrastructure/server';

describe('Leads API - create and list', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('creates and lists leads through HTTP routes', async () => {
    const createdLead = {
      id: 'lead-1',
      name: 'Alice',
      email: 'a@example.com',
      source: 'test',
      status: 'new',
      created_at: '2026-01-01T00:00:00.000Z'
    };

    mockPool.query
      .mockResolvedValueOnce({ rows: [createdLead] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [createdLead] });

    const app = buildServer();
    await app.ready();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/leads',
      payload: {
        name: 'Alice',
        email: 'a@example.com',
        source: 'test',
        termsAccepted: true,
        consentLgpd: true
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      id: 'lead-1',
      email: 'a@example.com',
      custom_fields_saved: 0
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/leads'
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual([createdLead]);

    await app.close();
  });
});
