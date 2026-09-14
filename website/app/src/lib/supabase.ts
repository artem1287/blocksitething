import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False until real Supabase credentials are set in `.env` (see `.env.example`) — screens that
 *  need an account check this instead of letting a client call fail confusingly. */
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseConfigured ? createClient(url, anonKey) : null;
