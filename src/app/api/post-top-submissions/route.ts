import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});

const client = new NeynarAPIClient(config);

export async function POST(request: NextRequest) {
  try {
    const { period = 'daily' } = await request.json();
    
    // Generate the image URL
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://farfessions.vercel.app';
    const imageUrl = `${baseUrl}/api/generate-top-submissions-image?period=${period}&limit=3`;
    
    // Create the cast text
    const castText = period === 'daily' 
      ? "🏆 Top Farfessions from the past 24 hours! What secrets are resonating with the community? 🤫"
      : "🏆 Top Farfessions from this week! The community has spoken 🤫";
    
    // Post to Farcaster
    const castResponse = await client.publishCast({
      signerUuid: process.env.FARFESSIONS_SIGNER_UUID!,
      text: castText,
      embeds: [{ url: imageUrl }],
    });
    
    return NextResponse.json({ 
      success: true, 
      castHash: castResponse.cast.hash,
      castUrl: `https://warpcast.com/farfessions/${castResponse.cast.hash.slice(0, 10)}`,
      imageUrl
    });
  } catch (error) {
    console.error('Error posting top submissions:', error);
    return NextResponse.json(
      { error: 'Failed to post top submissions' },
      { status: 500 }
    );
  }
} 