
create policy "own upload certificates" on storage.objects for insert to authenticated
  with check (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own read certificates" on storage.objects for select to authenticated
  using (bucket_id = 'certificates' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid())));
create policy "own delete certificates" on storage.objects for delete to authenticated
  using (bucket_id = 'certificates' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid())));
