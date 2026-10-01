-- =============================================================================
-- 6. RLS e permissões
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array['rede','regional','escola','perfil','auditoria','instrumento_versao','bloco','item',
                           'campanha','escola_campanha','sessao','participante','resposta_item'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  -- Escrita direta: só admin. participante, perfil e auditoria só mudam por funções.
  foreach t in array array['rede','regional','escola','instrumento_versao','bloco','item','campanha','escola_campanha'] loop
    execute format('create policy admin_escreve on public.%I for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t);
  end loop;
end $$;

create policy leitura on public.rede for select to authenticated using (public.pode_ver_rede(id));
create policy leitura on public.regional for select to authenticated using (public.pode_ver_rede(rede_id));
create policy leitura on public.escola for select to authenticated using (public.pode_ver_escola(co_inep));
create policy leitura on public.campanha for select to authenticated using (public.pode_ver_rede(rede_id));
create policy leitura on public.escola_campanha for select to authenticated using (public.pode_ver_escola(co_inep));
create policy leitura on public.instrumento_versao for select to authenticated using (true);
create policy leitura on public.bloco for select to authenticated using (true);
create policy leitura on public.item for select to authenticated using (true);
create policy leitura on public.sessao for select to authenticated using (public.ve_respostas());
create policy anular on public.sessao for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy leitura on public.resposta_item for select to authenticated using (public.ve_respostas());
create policy leitura on public.auditoria for select to authenticated using (public.eh_admin());
create policy leitura on public.perfil for select to authenticated
  using (user_id = auth.uid() or public.eh_admin() or rede_id = public.rede_gerida());
-- participante: nenhuma policy de leitura. Exclusão (pedido de titular) só pelo admin.
create policy admin_exclui on public.participante for delete to authenticated using (public.eh_admin());

revoke all on all tables in schema public from anon;
revoke all on public.v_escola_status, public.v_campanha_resumo, public.v_resposta_export from anon;
grant select on public.v_escola_status, public.v_campanha_resumo, public.v_resposta_export to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;  -- o RLS decide
grant usage, select on all sequences in schema public to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.instrumento_da_campanha(text), public.registrar_recusa(text),
  public.iniciar_sessao(text, integer, smallint, text, date, text, text, boolean),
  public.salvar_bloco(uuid, text, text, jsonb), public.concluir(uuid, text) to anon, authenticated;
grant execute on function public.eh_admin(), public.ve_respostas(), public.pode_ver_rede(uuid), public.pode_ver_escola(integer),
  public.rede_gerida(), public.pode_gerir(public.papel, uuid), public.definir_ativo(uuid, boolean),
  public.importar_instrumento(text, jsonb), public.ver_participantes(uuid, integer),
  public.normaliza_texto(text), public.normaliza_nome(text), public.idade_em(date, date),
  public.valor_valido(public.item, jsonb) to authenticated;
grant execute on all functions in schema public to service_role;

-- Funções criadas depois deste script não ficam abertas a anon por padrão.
alter default privileges in schema public revoke execute on functions from public, anon;

