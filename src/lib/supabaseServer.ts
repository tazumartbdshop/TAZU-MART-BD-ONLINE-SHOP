import { createClient } from '@supabase/supabase-js';

const SUPABASE_DEFAULT_URL = 'https://gaqyfjztpxvzijouiwwh.supabase.co';
const SUPABASE_DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcXlmanp0cHh2emlqb3Vpd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTM0NTIsImV4cCI6MjA5NTE2OTQ1Mn0.LdN6jVd5fYi_KsJnjridUl3Gr_RxahnXRvahb5dggsw';
const SUPABASE_DEFAULT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcXlmanp0cHh2emlqb3Vpd3doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MzQ1MiwiZXhwIjoyMDk1MTY5NDUyfQ.TDCcHuch5MAn49KmnTZoPj9B3BiOany_OxhiRk92QJA';

export const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || SUPABASE_DEFAULT_URL;
export const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_DEFAULT_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_DEFAULT_SERVICE_KEY;

// Authoritative server-side Supabase client with admin rights
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
