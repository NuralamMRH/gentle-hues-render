import { supabase } from "@/integrations/supabase/client";

type Attachment = { path: string; mime: string; name: string };

/** Uploads chat files to the user's private folder. */
export async function uploadChatFiles(files: File[]): Promise<Attachment[]> {
  if (!files.length) return [];
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Sign in to attach files.");
  const out: Attachment[] = [];
  for (const file of files.slice(0, 6)) {
    const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage.from("chat-uploads").upload(path, file);
    if (error) throw new Error(error.message);
    out.push({ path, mime: file.type || "application/octet-stream", name: file.name });
  }
  return out;
}

