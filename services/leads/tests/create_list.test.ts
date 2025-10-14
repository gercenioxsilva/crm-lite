import { InMemoryLeadRepository } from '../src/infrastructure/repositories/InMemoryLeadRepository';
import { CreateLead } from '../src/application/use-cases/CreateLead';
import { ListLeads } from '../src/application/use-cases/ListLeads';

describe('Leads - Create & List', () => {
  it('creates and lists leads', async () => {
    const repo = new InMemoryLeadRepository();
    const create = new CreateLead(repo as any);
    const list = new ListLeads(repo as any);
    await create.execute({ name: 'Alice', email: 'a@example.com', source: 'test' });
    const items = await list.execute();
    expect(items.length).toBe(1);
    expect(items[0].props.email).toBe('a@example.com');
  });
});
