-- Alexbarça — libera as tabelas para quem está logado.
-- Cole tudo no SQL Editor do Supabase e toque em Run.
-- Nada é liberado para quem não entrou (anon).
-- A proteção por linha continua valendo: cada pessoa só vê o que é seu.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.gastos to authenticated;
grant select on table public.resumos to authenticated;

-- Conferência: mostra se a proteção por linha está ligada
-- e quais regras existem em cada tabela.
select
  c.relname as tabela,
  c.relrowsecurity as protecao_ligada,
  p.policyname as regra,
  p.cmd as operacao,
  p.qual as quem_pode_ver,
  p.with_check as quem_pode_gravar
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where c.relname in ('gastos', 'resumos')
order by c.relname, p.policyname;
