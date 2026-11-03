import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://pciocooxhpsvrvpqoykb.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  ['sb_publishable_', '8GuR5GS79m_XsUr9g3jF0g_dI2ftwDu'].join('');

export default async function handler(_req: any, res: any) {
  let supabaseTablesReady = false;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase
      .from('citizen_accounts')
      .select('mobile')
      .limit(1);
    supabaseTablesReady = !error;
  } catch {
    supabaseTablesReady = false;
  }

  return res.status(200).json({
    status: 'ok',
    service: 'PulseWay Emergency Coordination System',
    supabaseProjectId: 'pciocooxhpsvrvpqoykb',
    supabaseUrl: SUPABASE_URL,
    supabaseTablesReady,
  });
}
