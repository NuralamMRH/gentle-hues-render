CREATE POLICY chat_uploads_own_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY chat_uploads_own_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY chat_uploads_own_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);