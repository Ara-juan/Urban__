// Cliente de Supabase para subida directa de imágenes al bucket "Imagenes"
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://duuuqlbabwmidigdeybd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dXVxbGJhYndtaWRpZ2RleWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NDUzMTgsImV4cCI6MjEwNTIyMTMxOH0.fKwB40mMMjrF1pCgGrhKHmHqQBvpvFGyZpBYF7uOFVY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sube una imagen al bucket "Imagenes" y devuelve su URL pública
export async function subirImagenASupabase(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `prendas/${fileName}`;

  const { error } = await supabase.storage
    .from('Imagenes')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error('Error al subir la imagen: ' + error.message);
  }

  const { data: publicUrlData } = supabase.storage.from('Imagenes').getPublicUrl(filePath);
  return publicUrlData.publicUrl;
}
