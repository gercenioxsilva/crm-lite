const mockPool = {
  query: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

import { buildServer } from '../src/infrastructure/server';
import { drizzleLeadRows, leadRow } from './fixtures';

describe('Leads API - read and update', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('gets a lead by id', async () => {
    const lead = leadRow({
      name: 'Bob',
      email: 'b@example.com',
    });

    mockPool.query.mockResolvedValueOnce(drizzleLeadRows([lead]));

    const app = buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/leads/lead-1'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(lead);

    await app.close();
  });

  it('updates a lead with valid fields', async () => {
    const updatedLead = leadRow({
      name: 'Bob U',
      email: 'b2@example.com',
      source: 'updated',
      status: 'qualified',
    });

    mockPool.query.mockResolvedValueOnce({ rows: [updatedLead] });

    const app = buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'PUT',
      url: '/leads/lead-1',
      payload: {
        name: 'Bob U',
        email: 'b2@example.com',
        status: 'qualified'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(updatedLead);

    await app.close();
  });

  it('returns 404 when a lead is not found', async () => {
    mockPool.query.mockResolvedValueOnce(drizzleLeadRows([]));

    const app = buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/leads/missing'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Lead not found' });

    await app.close();
  });
});
