create policy "students update own" on public.students for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
