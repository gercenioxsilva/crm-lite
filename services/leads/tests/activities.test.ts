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

  it('ignores invalid activity outcome values before writing to the database', async () => {
    const activity = activityRow({
      type: 'call',
      subject: 'Contato sem outcome valido',
      description: 'Contato realizado',
      outcome: null,
    });

    mockPool.query
      .mockResolvedValueOnce({ rows: [['lead-1']] })
      .mockResolvedValueOnce(drizzleActivityRows([activity]));

    const app = buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/activities',
      payload: {
        lead_id: 'lead-1',
        type: 'call',
        description: 'Contato realizado',
        outcome: 'texto livre invalido',
      },
    });

    expect(response.statusCode).toBe(201);

    const insertCall = mockPool.query.mock.calls[1];
    const params: any[] = insertCall[1];

    expect(params).not.toContain('texto livre invalido');

    await app.close();
  });

  it('retries activity creation with safe values when legacy constraints reject the outcome', async () => {
    const activity = activityRow({
      type: 'meeting',
      subject: 'Reuniao com decisor',
      description: 'Reuniao realizada',
      outcome: 'completed',
      duration_minutes: 50,
    });

    mockPool.query
      .mockResolvedValueOnce({ rows: [['lead-1']] })
      .mockRejectedValueOnce({
        cause: {
          code: '23514',
          constraint: 'chk_activity_outcome',
        },
      })
      .mockResolvedValueOnce(drizzleActivityRows([activity]));

    const app = buildServer();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/activities',
      payload: {
        lead_id: 'lead-1',
        type: 'meeting',
        description: 'Reuniao realizada',
        outcome: 'not_interested',
        duration_minutes: 50,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: 'activity-1',
      outcome: 'completed',
    });

    const retryParams: any[] = mockPool.query.mock.calls[2][1];
    expect(retryParams).toContain('meeting');
    expect(retryParams).toContain('completed');
    expect(retryParams).not.toContain('not_interested');

    await app.close();
  });
});
