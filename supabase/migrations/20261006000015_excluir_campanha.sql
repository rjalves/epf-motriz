-- Exclusão de campanha (só admin). Apaga em cascata o plano amostral, as sessões, os cadastros e as
-- respostas dos estudantes daquela campanha. Irreversível: a tela pede confirmação e a auditoria registra.
create function public.excluir_campanha(p_campanha uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_slug text; v_sessoes int;
begin
  if not eh_admin() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  select slug into v_slug from campanha where id = p_campanha for update;
  if not found then raise exception 'campanha_inexistente' using errcode = 'P0001'; end if;
  select count(*) into v_sessoes from sessao where campanha_id = p_campanha;
  insert into auditoria (user_id, acao, alvo) values (auth.uid(), 'excluir_campanha', v_slug || ' (' || v_sessoes || ' sessões)');
  delete from campanha where id = p_campanha;
  return jsonb_build_object('slug', v_slug, 'sessoes', v_sessoes);
end $$;

revoke execute on function public.excluir_campanha(uuid) from public, anon;
grant execute on function public.excluir_campanha(uuid) to authenticated;
