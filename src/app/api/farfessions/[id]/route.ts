import { NextRequest, NextResponse } from 'next/server';
import { supabase, likeFarfession, dislikeFarfession } from '~/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const { action, userFid } = await request.json();
    
    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required to vote' },
        { status: 400 }
      );
    }
    
    if (action === 'like') {
      const result = await likeFarfession(id, userFid);
      return NextResponse.json({ success: true, data: result });
    } else if (action === 'dislike') {
      const result = await dislikeFarfession(id, userFid);
      return NextResponse.json({ success: true, data: result });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "like" or "dislike"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(`Error processing action for farfession ${params.id}:`, error);
    
    // Handle specific voting errors
    if (error instanceof Error) {
      if (error.message.includes('already')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict status for duplicate votes
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
} 