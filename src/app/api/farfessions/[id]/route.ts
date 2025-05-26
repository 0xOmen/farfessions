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

    const { action } = await request.json();
    
    if (action === 'like') {
      const result = await likeFarfession(id);
      return NextResponse.json({ success: true, data: result });
    } else if (action === 'dislike') {
      const result = await dislikeFarfession(id);
      return NextResponse.json({ success: true, data: result });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "like" or "dislike"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(`Error processing action for farfession ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
} 