const mockPool = {
  query: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

import { buildServer } from '../src/infrastructure/server';
import { activityRow, drizzleActivityRows } from './fixtures';

describe('Leads API - activities with Drizzle', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('creates an activity for an existing lead through HTTP route', async () => {
    const activity = activityRow({
      type: 'call',
      subject: 'Ligacao inicial',
      description: 'Contato realizado com decisor',
      duration_minutes: 15,
      created_by: 'admin@quiz.com',
    });

    mockPool.query
      .mockResolvedValueOnce({ rows: [['lead-1']] })
      .mockResolvedValueOnce(drizzleActivityRows([activity]));

    const app = buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/leads/lead-1/activities',
      payload: {
        type: 'call',
        subject: 'Ligacao inicial',
        description: 'Contato realizado com decisor',
        duration_minutes: 15,
        created_by: 'admin@quiz.com',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: 'activity-1',
      lead_id: 'lead-1',
      type: 'call',
      subject: 'Ligacao inicial',
      duration_minutes: 15,
    });

    const insertCall = mockPool.query.mock.calls[1];
    const sql: string = typeof insertCall[0] === 'string' ? insertCall[0] : insertCall[0].text;
    const params: any[] = insertCall[1];

    expect(sql).toContain('"activities"');
    expect(sql).toContain('"tenant_id"');
    expect(params).toContain('lead-1');
    expect(params).toContain('admin@quiz.com');

    await app.close();
  });
});
