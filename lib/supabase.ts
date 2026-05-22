import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://otuhusanfhooenhplbxa.supabase.co';
const supabaseKey = 'sb_publishable_qHuqr9AY4YhFTKgQ0A9F6Q_PYgJjTlk';

export const supabase = createClient(supabaseUrl, supabaseKey);