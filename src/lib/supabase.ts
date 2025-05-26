import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Environment check:');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');
console.log('- Full URL length:', supabaseUrl.length);
console.log('- Full key length:', supabaseAnonKey.length);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  console.error('Expected: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
});

// Test the client configuration
console.log('Supabase client created successfully');

// Types for our database
export type Farfession = {
  id: number;
  user_fid: number | null;
  text: string;
  created_at: string;
  likes: number;
  dislikes: number;
};

// Function to test Supabase connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('farfessions').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Function to submit a new farfession
export async function submitFarfession(text: string, userFid?: number) {
  console.log('=== Submitting Farfession ===');
  console.log('Text:', text);
  console.log('User FID:', userFid);
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key length:', supabaseAnonKey.length);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  try {
    console.log('Making request to Supabase...');
    
    // Try a simpler insert without explicit likes/dislikes (let defaults handle it)
    const { data, error } = await supabase
      .from('farfessions')
      .insert([
        { 
          text, 
          user_fid: userFid || null
        }
      ])
      .select();

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Supabase error details:', error);
      console.error('Error code:', error.code);
      console.error('Error hint:', error.hint);
      console.error('Error details:', error.details);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Farfession submitted successfully:', data);
    return data;
  } catch (error) {
    console.error('Submit farfession error:', error);
    throw error;
  }
}

// Function to get all farfessions
export async function getFarfessions() {
  const { data, error } = await supabase
    .from('farfessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching farfessions:', error);
    throw error;
  }

  return data as Farfession[];
}

// Function to like a farfession
export async function likeFarfession(id: number) {
  const { data, error } = await supabase
    .from('farfessions')
    .select('likes')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching current likes:', error);
    throw error;
  }

  const { data: updateData, error: updateError } = await supabase
    .from('farfessions')
    .update({ likes: data.likes + 1 })
    .eq('id', id)
    .select();

  if (updateError) {
    console.error('Error updating likes:', updateError);
    throw updateError;
  }

  return updateData;
}

// Function to dislike a farfession
export async function dislikeFarfession(id: number) {
  const { data, error } = await supabase
    .from('farfessions')
    .select('dislikes')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching current dislikes:', error);
    throw error;
  }

  const { data: updateData, error: updateError } = await supabase
    .from('farfessions')
    .update({ dislikes: data.dislikes + 1 })
    .eq('id', id)
    .select();

  if (updateError) {
    console.error('Error updating dislikes:', updateError);
    throw updateError;
  }

  return updateData;
} 