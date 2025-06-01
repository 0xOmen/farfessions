import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 Starting daily image generation process...');
    
    const { adminFid } = await request.json();
    console.log('Admin FID received:', adminFid);
    
    // Verify admin access
    const ADMIN_FID = 212074;
    if (!adminFid || adminFid !== ADMIN_FID) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized: Only admin can generate daily images' },
        { status: 403 }
      );
    }

    console.log('✅ Admin access verified');

    // Generate the image by calling our image generation API
    // Use the request URL to construct the base URL instead of relying on env vars
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const imageUrl = `${baseUrl}/api/generate-daily-image?adminFid=${adminFid}`;
    console.log('🌐 Fetching image from:', imageUrl);
    
    const imageResponse = await fetch(imageUrl, { 
      method: 'GET',
      headers: {
        'User-Agent': 'Farfessions-Image-Generator/1.0'
      }
    });

    console.log('📡 Image response status:', imageResponse.status);
    console.log('📡 Image response headers:', Object.fromEntries(imageResponse.headers.entries()));

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('❌ Image generation failed:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      throw new Error(errorData.error || 'Failed to generate image');
    }

    console.log('✅ Image generated successfully');

    // Get the image buffer
    console.log('📥 Converting image to buffer...');
    const imageBuffer = await imageResponse.arrayBuffer();
    console.log(`📊 Image buffer size: ${imageBuffer.byteLength} bytes`);
    
    // Create filename with current date for reference
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `daily-farfession-${today}.png`;
    console.log('📝 Generated filename:', filename);
    
    console.log('🎉 Daily image generated successfully');
    
    // Return the image as a downloadable response instead of saving to file system
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('❌ Error generating daily image:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { error: `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 