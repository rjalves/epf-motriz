create function public.sessao_autorizada(p_sessao uuid, p_token text) returns public.sessao
language plpgsql stable security definer set search_path = public, extensions as $$
declare s sessao;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'sessao_invalida' using errcode = 'P0001'; end if;
  select * into s from sessao where id = p_sessao and token_hash = digest(decode(p_token, 'hex'), 'sha256');
  if not found then raise exception 'sessao_invalida' using errcode = 'P0001'; end if;
  if s.status <> 'em_andamento' then raise exception 'sessao_encerrada' using errcode = 'P0001'; end if;
  return s;
end $$;

create function public.valor_valido(i public.item, v jsonb) returns boolean
language sql immutable as $$
  select case i.tipo
    when 'likert5' then jsonb_typeof(v) = 'string' and i.opcoes ? (v #>> '{}')
    when 'unica' then jsonb_typeof(v) = 'string' and i.opcoes ? (v #>> '{}')
    when 'multipla' then jsonb_typeof(v) = 'array'
      and jsonb_array_length(v) between 1 and i.max_escolhas
      and not exists (select 1 from jsonb_array_elements_text(v) x where not i.opcoes ? x)
    when 'texto' then jsonb_typeof(v) = 'string' and length(v #>> '{}') <= 2000
    when 'numero' then jsonb_typeof(v) = 'number'
  end
$$;

create function public.salvar_bloco(p_sessao uuid, p_token text, p_bloco text, p_respostas jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s sessao; b bloco; i item; v jsonb; extra text; visivel boolean;
begin
  s := sessao_autorizada(p_sessao, p_token);
  select bl.* into b from bloco bl join campanha c on c.instrumento_versao_id = bl.versao_id
  where c.id = s.campanha_id and bl.codigo = p_bloco and (bl.series is null or s.serie = any (bl.series));
  if not found then raise exception 'bloco_invalido' using errcode = 'P0001'; end if;

  select k into extra from jsonb_object_keys(coalesce(p_respostas, '{}')) k
  where not exists (select 1 from item where bloco_id = b.id and codigo = k) limit 1;
  if extra is not null then raise exception 'item_invalido: %', extra using errcode = 'P0001'; end if;

  for i in select * from item where bloco_id = b.id order by ordem loop
    v := p_respostas -> i.codigo;
    visivel := i.depende_de is null or p_respostas ->> (i.depende_de ->> 'item') = i.depende_de ->> 'valor';
    if not visivel or v is null or v = 'null'::jsonb then
      if visivel and i.obrigatorio then raise exception 'obrigatorio_ausente: %', i.codigo using errcode = 'P0001'; end if;
      delete from resposta_item where sessao_id = s.id and item_id = i.id;
    elsif not coalesce(valor_valido(i, v), false) then
      raise exception 'valor_invalido: %', i.codigo using errcode = 'P0001';
    else
      insert into resposta_item (sessao_id, item_id, valor) values (s.id, i.id, v)
      on conflict (sessao_id, item_id) do update set valor = excluded.valor, respondido_em = now();
    end if;
  end loop;

  update sessao set blocos_salvos = array(select distinct unnest(blocos_salvos || p_bloco) order by 1)
  where id = s.id returning * into s;
  return jsonb_build_object('ok', true, 'blocos_salvos', to_jsonb(s.blocos_salvos));
end $$;

create function public.concluir(p_sessao uuid, p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare s sessao;
begin
  s := sessao_autorizada(p_sessao, p_token);
  if exists (select 1 from bloco b join campanha c on c.instrumento_versao_id = b.versao_id
             where c.id = s.campanha_id and (b.series is null or s.serie = any (b.series))
               and not (b.codigo = any (s.blocos_salvos))
               and exists (select 1 from item i where i.bloco_id = b.id and i.obrigatorio)) then
    raise exception 'blocos_pendentes' using errcode = 'P0001';
  end if;
  update sessao set status = 'concluida', concluido_em = now() where id = s.id;
end $$;

