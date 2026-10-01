begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(2);
select is((select count(*) from rede where nome in ('Rio de Janeiro','Fortaleza','Recife','Porto Alegre','Natal','Teresina','João Pessoa'))::int, 7, 'as 7 redes da governança existem');
select is((select count(*) from rede where pulso_matematica)::int, 3, 'Pulso de Matemática: Rio de Janeiro, Recife e Porto Alegre');
select * from finish();
rollback;
