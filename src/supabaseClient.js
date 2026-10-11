import { createClient } from '@supabase/supabase-js';

// These come from Netlify environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper — upload a file (images, pdf, etc)
export async function uploadFile(bucketName, filePath, file) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, { upsert: true });

  if (error) throw error;
  return data;
}

// Helper — get a public URL
export function getPublicUrl(bucketName, filePath) {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// Helper — send a chat message to your table
export async function sendMessage(table, messageObject) {
  const { data, error } = await supabase
    .from(table)
    .insert(messageObject);

  if (error) throw error;
  return data;
}

// Helper — fetch messages for a chat room
export async function getMessages(table, roomId) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
