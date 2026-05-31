import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseAdminClient() {
  // Cloudflare Workers exposes secrets via globalThis, not process.env
  const SUPABASE_URL =
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    (globalThis as any).SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE_KEY =
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    (globalThis as any).SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});