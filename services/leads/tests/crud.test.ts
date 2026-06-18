const mockPool = {
  query: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

import { buildServer } from '../src/infrastructure/server';

describe('Leads API - read and update', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('gets a lead by id', async () => {
    const lead = {
      id: 'lead-1',
      name: 'Bob',
      email: 'b@example.com',
      source: 'test',
      status: 'new'
    };

    mockPool.query.mockResolvedValueOnce({ rows: [lead] });

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
    const updatedLead = {
      id: 'lead-1',
      name: 'Bob U',
      email: 'b2@example.com',
      source: 'updated',
      status: 'qualified'
    };

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
    mockPool.query.mockResolvedValueOnce({ rows: [] });

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
