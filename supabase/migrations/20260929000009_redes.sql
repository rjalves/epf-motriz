-- Redes da governança IS & Motriz (situação em 15/09/2026). Idempotente.
insert into public.rede (nome, uf, esfera, pulso_matematica) values
  ('Rio de Janeiro', 'RJ', 'municipal', true),
  ('Fortaleza',      'CE', 'municipal', false),
  ('Recife',         'PE', 'municipal', true),
  ('Porto Alegre',   'RS', 'municipal', true),
  ('Natal',          'RN', 'municipal', false),
  ('Teresina',       'PI', 'municipal', false),
  ('João Pessoa',    'PB', 'municipal', false)
on conflict (nome) do nothing;
