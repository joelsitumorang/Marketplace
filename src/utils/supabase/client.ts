import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "Supabase URL atau Anon Key tidak ditemukan. Sinkronisasi realtime stok dinonaktifkan."
    );
    return null;
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};
