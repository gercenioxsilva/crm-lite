const mockPool = {
  query: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

import { buildServer } from '../src/infrastructure/server';
import { drizzleLeadRows, leadRow } from './fixtures';

describe('Leads API - create and list', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('creates and lists leads through HTTP routes', async () => {
    const createdLead = leadRow({
      name: 'Alice',
      email: 'a@example.com',
    });

    mockPool.query
      .mockResolvedValueOnce(drizzleLeadRows([createdLead]))
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(drizzleLeadRows([createdLead]));

    const app = buildServer();
    await app.ready();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/leads',
      payload: {
        name: 'Alice',
        email: 'a@example.com',
        source: 'test',
        lead_value: 12345,
        expected_close_date: '2026-07-01',
        priority: 'high',
        assigned_to: 'owner@quiz.com',
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

    const insertParams: any[] = mockPool.query.mock.calls[0][1];
    expect(insertParams).toContain('12345');
    expect(insertParams).toContain('2026-07-01');
    expect(insertParams).toContain('high');
    expect(insertParams).toContain('owner@quiz.com');

    const listResponse = await app.inject({
      method: 'GET',
      url: '/leads'
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual([createdLead]);

    await app.close();
  });
});
