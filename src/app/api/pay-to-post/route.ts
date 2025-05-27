import { NextRequest, NextResponse } from 'next/server';
import { submitFarfession } from '~/lib/supabase';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});

const client = new NeynarAPIClient(config);

export async function POST(request: NextRequest) {
  try {
    const { text, userFid, paymentTxHash } = await request.json();
    
    if (!text || !paymentTxHash) {
      return NextResponse.json(
        { error: 'Text and payment transaction hash are required' },
        { status: 400 }
      );
    }

    // TODO: Verify the payment transaction on-chain here
    // For now, we'll trust that the frontend verified it
    
    // Submit to database
    await submitFarfession(text, userFid);
    
    // Post to Farcaster via farfessions account
    const castResponse = await client.publishCast({
      signerUuid: process.env.FARFESSIONS_SIGNER_UUID!,
      text: `"${text}" - Anonymous Farfession`,
    });
    
    return NextResponse.json({ 
      success: true, 
      castHash: castResponse.cast.hash,
      castUrl: `https://warpcast.com/farfessions/${castResponse.cast.hash.slice(0, 10)}`
    });
  } catch (error) {
    console.error('Error processing pay-to-post:', error);
    return NextResponse.json(
      { error: 'Failed to process payment and post' },
      { status: 500 }
    );
  }
} 