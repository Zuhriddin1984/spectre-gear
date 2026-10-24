-- Dates in the database (late returns, "today") follow Tashkent time, not UTC.
alter database postgres set timezone to 'Asia/Tashkent';

-- Trigger and helper functions are not meant to be called through the API.
revoke execute on function public.handle_new_user(), public.protect_role() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.create_first_admin(text, text) from authenticated;

-- Staff can read photo records too (Storage needs it alongside insert when uploading).
create policy "staff read photos" on storage.objects for select to authenticated using (bucket_id = 'photos');
