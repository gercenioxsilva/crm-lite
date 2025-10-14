import { InMemoryLeadRepository } from '../src/infrastructure/repositories/InMemoryLeadRepository';
import { CreateLead } from '../src/application/use-cases/CreateLead';
import { GetLeadById } from '../src/application/use-cases/GetLeadById';
import { UpdateLead } from '../src/application/use-cases/UpdateLead';
import { DeleteLead } from '../src/application/use-cases/DeleteLead';

describe('Leads - CRUD', () => {
  it('gets, updates and deletes a lead', async () => {
    const repo = new InMemoryLeadRepository();
    const create = new CreateLead(repo as any);
    const get = new GetLeadById(repo as any);
    const update = new UpdateLead(repo as any);
    const del = new DeleteLead(repo as any);

    const created = await create.execute({ name: 'Bob', email: 'b@example.com', source: 'test' });
    const found = await get.execute(created.props.id);
    expect(found?.props.email).toBe('b@example.com');

    const updated = await update.execute({ id: created.props.id, name: 'Bob U', email: 'b2@example.com', source: 'updated' });
    expect(updated.props.name).toBe('Bob U');

    const res = await del.execute(created.props.id);
    expect(res.deleted).toBe(true);

    const missing = await get.execute(created.props.id);
    expect(missing).toBeNull();
  });
});
