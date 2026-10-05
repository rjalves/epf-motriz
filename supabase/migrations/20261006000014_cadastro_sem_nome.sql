-- O estudante não informa mais o nome. Sem identificação: cada início é uma resposta nova; a retomada
-- vale só no mesmo dispositivo (token guardado no navegador) e não há bloqueio de segunda resposta.
alter table public.participante alter column nome drop not null;
alter table public.participante drop constraint participante_campanha_id_co_inep_nome_norm_data_nascimento_key;

drop function public.iniciar_sessao(text, integer, smallint, text, date, text, text, boolean);
create function public.iniciar_sessao(
  p_slug text, p_co_inep integer, p_serie smallint, p_nascimento date,
  p_email text default null, p_telefone text default null, p_autorizacao_responsavel boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  c campanha; v_idade int; v_token bytea := gen_random_bytes(32); v_sessao sessao;
begin
  select * into c from campanha where slug = p_slug;
  if not found then raise exception 'campanha_inexistente' using errcode = 'P0001'; end if;
  if not c.aberta or current_date not between c.janela_inicio and c.janela_fim then
    raise exception 'campanha_fechada' using errcode = 'P0001'; end if;
  if not exists (select 1 from escola_campanha where campanha_id = c.id and co_inep = p_co_inep) then
    raise exception 'escola_invalida' using errcode = 'P0001'; end if;
  if not (p_serie = any (c.series)) then raise exception 'serie_invalida' using errcode = 'P0001'; end if;
  v_idade := idade_em(p_nascimento, current_date);
  if v_idade is null or v_idade not between 9 and 18 then raise exception 'idade_invalida' using errcode = 'P0001'; end if;
  if v_idade < 12 and not coalesce(p_autorizacao_responsavel, false) then
    raise exception 'autorizacao_necessaria' using errcode = 'P0001'; end if;

  insert into sessao (campanha_id, co_inep, serie, idade, token_hash, autorizacao_responsavel)
  values (c.id, p_co_inep, p_serie, v_idade, digest(v_token, 'sha256'), coalesce(p_autorizacao_responsavel, false))
  returning * into v_sessao;
  insert into participante (campanha_id, co_inep, serie, data_nascimento, email, telefone, sessao_id)
  values (c.id, p_co_inep, p_serie, p_nascimento, nullif(btrim(p_email), ''),
          nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), ''), v_sessao.id);
  return jsonb_build_object('sessao_id', v_sessao.id, 'token', encode(v_token, 'hex'), 'retomada', false,
                            'serie', p_serie, 'blocos_salvos', '[]'::jsonb);
end $$;

revoke execute on function public.iniciar_sessao(text, integer, smallint, date, text, text, boolean) from public;
grant execute on function public.iniciar_sessao(text, integer, smallint, date, text, text, boolean) to anon, authenticated;
