import { NextRequest, NextResponse } from 'next/server';
import { submitFarfession, getFarfessions, getFarfessionsWithUserVotes } from '~/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userFid = searchParams.get('userFid');
    
    if (userFid) {
      const farfessions = await getFarfessionsWithUserVotes(parseInt(userFid));
      return NextResponse.json({ farfessions });
    } else {
      const farfessions = await getFarfessions();
      return NextResponse.json({ farfessions });
    }
  } catch (error) {
    console.error('Error fetching farfessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farfessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, userFid } = await request.json();
    
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const result = await submitFarfession(text.trim(), userFid);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting farfession:', error);
    return NextResponse.json(
      { error: 'Failed to submit farfession' },
      { status: 500 }
    );
  }
} 