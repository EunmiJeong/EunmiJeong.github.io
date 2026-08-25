import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase 프로젝트의 Project URL / anon public key 를 넣으세요.
const SUPABASE_URL = 'https://gdeuokvcwdreewtiyhhg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ek_moT1UBmHifufv4MwoWA_mSozuQrg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
