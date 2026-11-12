-- Book ahead rows are the owner's to-do list ("Ask Dez: ..."). Anyone with the
-- anon key could read them; now only the service key can (via /api/logistics/book).
drop policy if exists koji_public_read_logistics on koji_logistics;
create policy koji_public_read_logistics on koji_logistics
  for select using (column_key <> 'book');
