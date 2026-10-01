-- =============================================================================
-- 5. Views de monitoramento (dono = quem executa o script; filtram pelo escopo do usuário)
-- =============================================================================

create view public.v_escola_status as
with contagem as (
  select s.campanha_id, s.co_inep,
         count(*) filter (where s.status = 'concluida' and s.serie = 6) as validos_6,
         count(*) filter (where s.status = 'concluida' and s.serie = 7) as validos_7,
         count(*) filter (where s.status = 'concluida' and s.serie = 8) as validos_8,
         count(*) filter (where s.status = 'concluida' and s.serie = 9) as validos_9,
         count(*) filter (where s.status = 'concluida' and s.serie = any (c.series)) as validos,
         count(*) filter (where s.status = 'em_andamento') as em_andamento
  from public.sessao s join public.campanha c on c.id = s.campanha_id
  group by s.campanha_id, s.co_inep
), base as (
  select ec.campanha_id, c.rede_id, e.co_inep, e.nome, e.regional_id, coalesce(rg.nome, 'Sem regional') as regional,
         ec.in_amostra, ec.meta_manual, c.meta_pct,
         ( case when 6 = any (c.series) then ec.qt_mat_6 else 0 end
         + case when 7 = any (c.series) then ec.qt_mat_7 else 0 end
         + case when 8 = any (c.series) then ec.qt_mat_8 else 0 end
         + case when 9 = any (c.series) then ec.qt_mat_9 else 0 end ) as matriculas
  from public.escola_campanha ec
  join public.campanha c on c.id = ec.campanha_id
  join public.escola e on e.co_inep = ec.co_inep
  left join public.regional rg on rg.id = e.regional_id
  where public.pode_ver_escola(e.co_inep)
), com_meta as (
  select b.*, case when b.in_amostra then coalesce(b.meta_manual, round(b.meta_pct * b.matriculas)::int) else 0 end as meta
  from base b
)
select m.campanha_id, m.rede_id, m.co_inep, m.nome, m.regional_id, m.regional, m.in_amostra, m.matriculas, m.meta,
       coalesce(k.validos_6, 0) as validos_6, coalesce(k.validos_7, 0) as validos_7,
       coalesce(k.validos_8, 0) as validos_8, coalesce(k.validos_9, 0) as validos_9,
       coalesce(k.validos, 0) as validos, coalesce(k.em_andamento, 0) as em_andamento,
       round(coalesce(k.validos, 0)::numeric / nullif(m.meta, 0), 4) as pct_meta,
       case when not m.in_amostra then 'fora_amostra'
            when coalesce(k.validos, 0) = 0 then 'nao_iniciada'
            when k.validos >= m.meta then 'concluida'
            else 'iniciada' end as status
from com_meta m
left join contagem k on k.campanha_id = m.campanha_id and k.co_inep = m.co_inep;
comment on view public.v_escola_status is 'Status da coleta por escola × campanha, recortado pelo escopo do usuário.';

create view public.v_campanha_resumo as
select c.id as campanha_id, c.rede_id, rd.nome as rede, c.numero, c.slug, c.janela_inicio, c.janela_fim, c.aberta, c.recusas,
       coalesce(s.sessoes, 0) as sessoes,
       coalesce(s.em_andamento, 0) as em_andamento,
       coalesce(s.respondentes_amostra, 0) as respondentes_amostra,
       coalesce(s.respondentes_fora_amostra, 0) as respondentes_fora_amostra,
       coalesce(s.matriculas_amostra, 0) as matriculas_amostra,
       coalesce(s.meta_total, 0) as meta_total,
       round(coalesce(s.respondentes_amostra, 0)::numeric / nullif(s.meta_total, 0), 4) as pct_meta,
       coalesce(s.escolas_amostra, 0) as escolas_amostra,
       coalesce(s.escolas_concluidas, 0) as escolas_concluidas,
       coalesce(s.escolas_iniciadas, 0) as escolas_iniciadas,
       coalesce(s.escolas_nao_iniciadas, 0) as escolas_nao_iniciadas,
       coalesce(s.regionais_amostra, 0) as regionais_amostra,
       coalesce(s.regionais_iniciadas, 0) as regionais_iniciadas
from public.campanha c
join public.rede rd on rd.id = c.rede_id
left join lateral (
  select sum(validos + em_andamento) as sessoes,
         sum(em_andamento) as em_andamento,
         sum(validos) filter (where in_amostra) as respondentes_amostra,
         sum(validos) filter (where not in_amostra) as respondentes_fora_amostra,
         sum(matriculas) filter (where in_amostra) as matriculas_amostra,
         sum(meta) filter (where in_amostra) as meta_total,
         count(*) filter (where in_amostra) as escolas_amostra,
         count(*) filter (where status = 'concluida') as escolas_concluidas,
         count(*) filter (where status = 'iniciada') as escolas_iniciadas,
         count(*) filter (where status = 'nao_iniciada') as escolas_nao_iniciadas,
         count(distinct regional) filter (where in_amostra) as regionais_amostra,
         count(distinct regional) filter (where in_amostra and validos > 0) as regionais_iniciadas
  from public.v_escola_status es where es.campanha_id = c.id
) s on true
where public.pode_ver_rede(c.rede_id);
comment on view public.v_campanha_resumo is 'Indicadores do painel por campanha; as somas respeitam o escopo do usuário.';

create view public.v_resposta_export as
select s.id as sessao, c.slug as campanha, rd.nome as rede, s.co_inep, e.nome as escola, s.serie, s.idade, s.status,
       b.codigo as bloco, i.codigo as item, i.construto, i.reverso, r.valor, r.respondido_em
from public.resposta_item r
join public.sessao s on s.id = r.sessao_id
join public.campanha c on c.id = s.campanha_id
join public.rede rd on rd.id = c.rede_id
join public.escola e on e.co_inep = s.co_inep
join public.item i on i.id = r.item_id
join public.bloco b on b.id = i.bloco_id
where public.ve_respostas() and s.status <> 'anulada';
comment on view public.v_resposta_export is 'Respostas pseudonimizadas (sem nome/contato/nascimento). Só admin e pesquisador.';

create function public.ver_participantes(p_campanha uuid, p_co_inep integer)
returns table (sessao_id uuid, nome text, data_nascimento date, email text, telefone text, serie smallint, status text)
language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  insert into auditoria (user_id, acao, alvo) values (auth.uid(), 'ver_participantes', p_campanha || '/' || p_co_inep);
  return query select p.sessao_id, p.nome, p.data_nascimento, p.email, p.telefone, p.serie, s.status
               from participante p join sessao s on s.id = p.sessao_id
               where p.campanha_id = p_campanha and p.co_inep = p_co_inep order by p.nome;
end $$;

