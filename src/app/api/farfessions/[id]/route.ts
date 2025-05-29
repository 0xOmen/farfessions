import { NextRequest, NextResponse } from 'next/server';
import { likeFarfession, dislikeFarfession } from '~/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const { action, userFid } = await request.json();
    
    console.log('API Route - Processing vote:', { id, action, userFid });
    
    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required to vote' },
        { status: 400 }
      );
    }
    
    if (action === 'like') {
      const result = await likeFarfession(id, userFid);
      console.log('API Route - Like result:', result);
      return NextResponse.json({ success: true, data: result });
    } else if (action === 'dislike') {
      const result = await dislikeFarfession(id, userFid);
      console.log('API Route - Dislike result:', result);
      return NextResponse.json({ success: true, data: result });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "like" or "dislike"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(`Error processing ${request.method} for farfession:`, error);
    
    // Handle specific voting errors
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      if (error.message.includes('already')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict status for duplicate votes
        );
      }
      
      // Return the actual error message for debugging
      return NextResponse.json(
        { error: `Failed to process action: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process action: Unknown error' },
      { status: 500 }
    );
  }
} 