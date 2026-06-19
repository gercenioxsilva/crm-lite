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
