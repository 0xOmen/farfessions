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
  is_hidden: boolean;
  hidden_by_fid: number | null;
  hidden_at: string | null;
};

export type Vote = {
  id: number;
  farfession_id: number;
  user_fid: number;
  vote_type: 'like' | 'dislike';
  created_at: string;
};

export type FarfessionWithUserVote = Farfession & {
  user_vote?: 'like' | 'dislike' | null;
};

// Function to test Supabase connection
export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('farfessions').select('count').limit(1);
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

// Function to check if user can submit today (for client-side validation)
export async function canUserSubmitToday(userFid: number): Promise<boolean> {
  const ADMIN_FID = 212074;
  
  // Admin can always submit
  if (userFid === ADMIN_FID) {
    return true;
  }

  try {
    // Check if user has submitted today
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
    
    const { data, error } = await supabase
      .from('farfessions')
      .select('id')
      .eq('user_fid', userFid)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (error) {
      console.error('Error checking daily submission limit:', error);
      throw new Error(`Error checking submission limit: ${error.message}`);
    }

    // Return true if no submissions today (can submit), false if already submitted
    return data.length === 0;
  } catch (error) {
    console.error('Error in canUserSubmitToday:', error);
    throw error;
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

// Function to get farfessions with user vote status
export async function getFarfessionsWithUserVotes(userFid?: number) {
  const ADMIN_FID = 212074;
  const isAdmin = userFid === ADMIN_FID;

  // Build query - admin sees all, others only see non-hidden
  let query = supabase
    .from('farfessions')
    .select('*');

  // Non-admin users should not see hidden farfessions
  if (!isAdmin) {
    query = query.eq('is_hidden', false);
  }

  const { data: farfessions, error: farfessionsError } = await query
    .order('created_at', { ascending: false });

  if (farfessionsError) {
    console.error('Error fetching farfessions:', farfessionsError);
    throw farfessionsError;
  }

  if (!userFid) {
    return farfessions.map(f => ({ ...f, user_vote: null })) as FarfessionWithUserVote[];
  }

  // Get user's votes for these farfessions
  const farfessionIds = farfessions.map(f => f.id);
  const { data: votes, error: votesError } = await supabase
    .from('votes')
    .select('farfession_id, vote_type')
    .eq('user_fid', userFid)
    .in('farfession_id', farfessionIds);

  if (votesError) {
    console.error('Error fetching user votes:', votesError);
    throw votesError;
  }

  // Create a map of farfession_id to vote_type
  const voteMap = new Map(votes.map(v => [v.farfession_id, v.vote_type]));

  // Combine farfessions with user vote status
  return farfessions.map(f => ({
    ...f,
    user_vote: voteMap.get(f.id) || null
  })) as FarfessionWithUserVote[];
}

// Function to vote on a farfession (like or dislike)
export async function voteOnFarfession(farfessionId: number, userFid: number, voteType: 'like' | 'dislike') {
  console.log('=== Voting on Farfession ===');
  console.log('Farfession ID:', farfessionId);
  console.log('User FID:', userFid);
  console.log('Vote Type:', voteType);
  console.log('Supabase URL configured:', !!supabaseUrl);
  console.log('Supabase Key configured:', !!supabaseAnonKey);

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error('Supabase is not configured. Please check your environment variables.');
    console.error('Configuration error:', error);
    throw error;
  }

  const ADMIN_FID = 212074; // Your admin FID
  const isAdmin = userFid === ADMIN_FID;
  console.log('Is admin user:', isAdmin);

  try {
    if (isAdmin) {
      console.log('Processing admin vote - allowing multiple votes');
      // Admin can vote multiple times - just insert a new vote
      const { error: insertError } = await supabase
        .from('votes')
        .insert([{
          farfession_id: farfessionId,
          user_fid: userFid,
          vote_type: voteType
        }]);

      if (insertError) {
        console.error('Error inserting admin vote:', insertError);
        console.error('Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        throw new Error(`Error inserting vote: ${insertError.message}`);
      }

      console.log('Admin vote inserted successfully');
      // Update the farfession counts
      await updateFarfessionCounts(farfessionId);
      return { action: 'created', newVote: voteType, isAdmin: true };
    } else {
      console.log('Processing regular user vote - checking for existing vote');
      // Regular users - check for existing vote first
      const { data: existingVote, error: checkError } = await supabase
        .from('votes')
        .select('*')
        .eq('farfession_id', farfessionId)
        .eq('user_fid', userFid)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing vote:', checkError);
        console.error('Check error details:', {
          code: checkError.code,
          message: checkError.message,
          details: checkError.details,
          hint: checkError.hint
        });
        throw new Error(`Error checking existing vote: ${checkError.message}`);
      }

      console.log('Existing vote check result:', existingVote);

      if (existingVote) {
        // User has already voted
        if (existingVote.vote_type === voteType) {
          const error = new Error(`You have already ${voteType}d this farfession`);
          console.log('Duplicate vote attempt:', error.message);
          throw error;
        } else {
          console.log('User changing vote from', existingVote.vote_type, 'to', voteType);
          // User wants to change their vote
          const { error: updateError } = await supabase
            .from('votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          if (updateError) {
            console.error('Error updating vote:', updateError);
            console.error('Update error details:', {
              code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint
            });
            throw new Error(`Error updating vote: ${updateError.message}`);
          }

          console.log('Vote updated successfully');
          // Update the farfession counts
          await updateFarfessionCounts(farfessionId);
          return { action: 'updated', previousVote: existingVote.vote_type, newVote: voteType };
        }
      } else {
        console.log('User has not voted yet, creating new vote');
        // User hasn't voted yet, create new vote
        const { error: insertError } = await supabase
          .from('votes')
          .insert([{
            farfession_id: farfessionId,
            user_fid: userFid,
            vote_type: voteType
          }]);

        if (insertError) {
          console.error('Error inserting vote:', insertError);
          console.error('Insert error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          throw new Error(`Error inserting vote: ${insertError.message}`);
        }

        console.log('New vote inserted successfully');
        // Update the farfession counts
        await updateFarfessionCounts(farfessionId);
        return { action: 'created', newVote: voteType };
      }
    }
  } catch (error) {
    console.error('Vote farfession error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

// Function to update farfession like/dislike counts based on votes
async function updateFarfessionCounts(farfessionId: number) {
  console.log('=== Updating Farfession Counts ===');
  console.log('Farfession ID:', farfessionId);
  
  try {
    // Count likes and dislikes from votes table
    console.log('Counting likes...');
    const { data: likesData, error: likesError } = await supabase
      .from('votes')
      .select('id')
      .eq('farfession_id', farfessionId)
      .eq('vote_type', 'like');

    console.log('Counting dislikes...');
    const { data: dislikesData, error: dislikesError } = await supabase
      .from('votes')
      .select('id')
      .eq('farfession_id', farfessionId)
      .eq('vote_type', 'dislike');

    if (likesError || dislikesError) {
      console.error('Error counting votes:', { likesError, dislikesError });
      if (likesError) {
        console.error('Likes error details:', {
          code: likesError.code,
          message: likesError.message,
          details: likesError.details,
          hint: likesError.hint
        });
      }
      if (dislikesError) {
        console.error('Dislikes error details:', {
          code: dislikesError.code,
          message: dislikesError.message,
          details: dislikesError.details,
          hint: dislikesError.hint
        });
      }
      throw new Error('Error counting votes');
    }

    const likesCount = likesData?.length || 0;
    const dislikesCount = dislikesData?.length || 0;
    
    console.log('Vote counts:', { likesCount, dislikesCount });

    // Update the farfession with new counts
    console.log('Updating farfession with new counts...');
    const { error: updateError } = await supabase
      .from('farfessions')
      .update({
        likes: likesCount,
        dislikes: dislikesCount
      })
      .eq('id', farfessionId);

    if (updateError) {
      console.error('Error updating farfession counts:', updateError);
      console.error('Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      throw new Error(`Error updating farfession counts: ${updateError.message}`);
    }

    console.log(`Successfully updated farfession ${farfessionId}: ${likesCount} likes, ${dislikesCount} dislikes`);
  } catch (error) {
    console.error('Error in updateFarfessionCounts:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

// Legacy functions - keeping for backward compatibility but updating to use new voting system
// Function to like a farfession
export async function likeFarfession(id: number, userFid?: number) {
  if (!userFid) {
    throw new Error('User FID is required to vote');
  }
  return voteOnFarfession(id, userFid, 'like');
}

// Function to dislike a farfession
export async function dislikeFarfession(id: number, userFid?: number) {
  if (!userFid) {
    throw new Error('User FID is required to vote');
  }
  return voteOnFarfession(id, userFid, 'dislike');
}

// Function to hide/unhide a farfession (admin only)
export async function moderateFarfession(farfessionId: number, adminFid: number, hide: boolean) {
  console.log('=== Moderating Farfession ===');
  console.log('Farfession ID:', farfessionId);
  console.log('Admin FID:', adminFid);
  console.log('Action:', hide ? 'hide' : 'unhide');

  const ADMIN_FID = 212074;
  
  // Check if user is admin
  if (adminFid !== ADMIN_FID) {
    throw new Error('Only admin can moderate farfessions');
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  try {
    const updateData: any = {
      is_hidden: hide
    };

    if (hide) {
      // If hiding, record who hid it and when
      updateData.hidden_by_fid = adminFid;
      updateData.hidden_at = new Date().toISOString();
    } else {
      // If unhiding, clear the moderation fields
      updateData.hidden_by_fid = null;
      updateData.hidden_at = null;
    }

    const { error } = await supabase
      .from('farfessions')
      .update(updateData)
      .eq('id', farfessionId);

    if (error) {
      console.error('Error moderating farfession:', error);
      throw new Error(`Error moderating farfession: ${error.message}`);
    }

    console.log(`Farfession ${farfessionId} ${hide ? 'hidden' : 'unhidden'} successfully`);
    return { success: true, action: hide ? 'hidden' : 'unhidden' };
  } catch (error) {
    console.error('Moderation error:', error);
    throw error;
  }
}