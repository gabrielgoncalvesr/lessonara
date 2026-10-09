-- Correções do Security Advisor: funções SECURITY DEFINER não devem ser chamáveis pela API.

-- Gatilho de criação de professor: ninguém chama direto.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Usada pelas políticas de RLS (precisa de EXECUTE para authenticated), mas não deve
-- ficar exposta na API. Políticas referenciam a função por OID, então seguem válidas.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;
alter function public.owns_student(uuid) set schema private;
revoke execute on function private.owns_student(uuid) from public, anon;
grant execute on function private.owns_student(uuid) to authenticated, service_role;

-- Criada pela opção "Enable automatic RLS" do Supabase (event trigger).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable' and pronamespace = 'public'::regnamespace) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
