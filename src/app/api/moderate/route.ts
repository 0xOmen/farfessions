import { NextRequest, NextResponse } from 'next/server';
import { moderateFarfession } from '~/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { farfessionId, adminFid, hide } = await request.json();
    
    console.log('Moderation API - Processing request:', { farfessionId, adminFid, hide });
    
    if (!farfessionId || !adminFid || typeof hide !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: farfessionId, adminFid, hide' },
        { status: 400 }
      );
    }
    
    const result = await moderateFarfession(farfessionId, adminFid, hide);
    console.log('Moderation API - Success:', result);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Moderation API - Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Only admin can moderate')) {
        return NextResponse.json(
          { error: 'Unauthorized: Only admin can moderate farfessions' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: `Moderation failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Moderation failed: Unknown error' },
      { status: 500 }
    );
  }
} 