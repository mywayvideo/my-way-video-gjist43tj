// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const keyToUse = SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY

console.log('Supabase Client Initialization:')
if (!SUPABASE_URL) console.error('- VITE_SUPABASE_URL is missing!')
if (!keyToUse) console.error('- VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY is missing!')
if (SUPABASE_URL && keyToUse) console.log('- Environment variables verified.')

// Import the supabase client like this:
// import { supabase } from "@/lib/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, keyToUse, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
