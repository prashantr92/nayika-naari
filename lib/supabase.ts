import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kawvrnnbbabdjhiqrsuq.supabase.co';
const supabaseKey = 'sb_publishable_y5uaXFfh8xvzJc8V3Y5xvg_gLysAu-v';

export const supabase = createClient(supabaseUrl, supabaseKey);