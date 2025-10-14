-- Sample CRM data for demonstration
insert into leads (id, name, email, phone, cpf, birth_date, city, state, monthly_income, source, status, score, temperature, terms_accepted, consent_lgpd) values 
('11111111-1111-1111-1111-111111111111', 'João Silva Santos', 'joao.silva@email.com', '11987654321', '12345678901', '1985-03-15', 'São Paulo', 'SP', 8500.00, 'landing', 'qualified', 85, 'hot', true, true),
('22222222-2222-2222-2222-222222222222', 'Maria Oliveira Costa', 'maria.oliveira@gmail.com', '21987654321', '98765432109', '1990-07-22', 'Rio de Janeiro', 'RJ', 12000.00, 'google', 'proposal', 92, 'hot', true, true),
('33333333-3333-3333-3333-333333333333', 'Carlos Eduardo Lima', 'carlos.lima@hotmail.com', '31987654321', '11122233344', '1988-11-08', 'Belo Horizonte', 'MG', 6500.00, 'landing', 'contacted', 65, 'warm', true, true),
('44444444-4444-4444-4444-444444444444', 'Ana Paula Ferreira', 'ana.ferreira@yahoo.com', '47987654321', '55566677788', '1992-01-30', 'Florianópolis', 'SC', 9200.00, 'facebook', 'new', 45, 'cold', true, true),
('55555555-5555-5555-5555-555555555555', 'Roberto Almeida', 'roberto.almeida@outlook.com', '85987654321', '99988877766', '1983-09-12', 'Fortaleza', 'CE', 7800.00, 'landing', 'negotiation', 88, 'hot', true, true),
('66666666-6666-6666-6666-666666666666', 'Fernanda Santos', 'fernanda.santos@gmail.com', '62987654321', '12312312312', '1995-05-18', 'Goiânia', 'GO', 5500.00, 'google', 'qualified', 72, 'warm', true, true),
('77777777-7777-7777-7777-777777777777', 'Pedro Henrique', 'pedro.henrique@email.com', '81987654321', '45645645645', '1987-12-03', 'Recife', 'PE', 11500.00, 'landing', 'won', 95, 'hot', true, true),
('88888888-8888-8888-8888-888888888888', 'Juliana Rodrigues', 'juliana.rodrigues@hotmail.com', '71987654321', '78978978978', '1991-04-25', 'Salvador', 'BA', 8900.00, 'instagram', 'lost', 35, 'cold', true, true)
on conflict do nothing;

-- Assign leads to pipeline
insert into lead_pipeline (lead_id, pipeline_id, current_stage_id) values 
('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002'),
('22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440003'),
('33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('44444444-4444-4444-4444-444444444444', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('55555555-5555-5555-5555-555555555555', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004'),
('66666666-6666-6666-6666-666666666666', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002'),
('77777777-7777-7777-7777-777777777777', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440005'),
('88888888-8888-8888-8888-888888888888', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001')
on conflict do nothing;

-- Sample activities
insert into activities (lead_id, type, subject, description, outcome, completed_at, created_by) values 
('11111111-1111-1111-1111-111111111111', 'call', 'Ligação de qualificação', 'Cliente demonstrou interesse em conta premium', 'interested', now() - interval '2 days', 'vendedor1'),
('11111111-1111-1111-1111-111111111111', 'email', 'Envio de proposta', 'Enviada proposta personalizada de conta premium', 'success', now() - interval '1 day', 'vendedor1'),
('22222222-2222-2222-2222-222222222222', 'meeting', 'Reunião comercial', 'Apresentação de produtos e serviços', 'interested', now() - interval '3 days', 'vendedor2'),
('33333333-3333-3333-3333-333333333333', 'whatsapp', 'Primeiro contato', 'Mensagem de boas-vindas e agendamento', 'callback', now() - interval '1 day', 'vendedor1'),
('55555555-5555-5555-5555-555555555555', 'call', 'Negociação de taxas', 'Discussão sobre condições especiais', 'interested', now() - interval '4 hours', 'vendedor2')
on conflict do nothing;

-- Sample notes
insert into notes (lead_id, content, created_by) values 
('11111111-1111-1111-1111-111111111111', 'Cliente tem perfil para conta premium. Renda comprovada e histórico limpo no Serasa.', 'vendedor1'),
('22222222-2222-2222-2222-222222222222', 'Empresária interessada em produtos PJ. Agendar reunião com gerente especializado.', 'vendedor2'),
('33333333-3333-3333-3333-333333333333', 'Primeiro emprego formal. Explicar benefícios da conta digital.', 'vendedor1'),
('55555555-5555-5555-5555-555555555555', 'Cliente quer migrar de outro banco. Oferecer portabilidade gratuita.', 'vendedor2')
on conflict do nothing;

-- Assign tags to leads
insert into lead_tags (lead_id, tag_id) 
select l.id, t.id from leads l, tags t 
where (l.monthly_income > 10000 and t.name = 'VIP')
   or (l.status in ('qualified', 'proposal', 'negotiation') and t.name = 'Interessado')
   or (l.monthly_income > 8000 and t.name = 'Conta Premium')
on conflict do nothing;