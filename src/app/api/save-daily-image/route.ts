import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 Starting daily image save process...');
    
    const { adminFid } = await request.json();
    console.log('Admin FID received:', adminFid);
    
    // Verify admin access
    const ADMIN_FID = 212074;
    if (!adminFid || adminFid !== ADMIN_FID) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized: Only admin can save daily images' },
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
    
    // Create filename with current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `daily-farfession-${today}.png`;
    console.log('📝 Generated filename:', filename);
    
    // Ensure the images directory exists
    const imagesDir = join(process.cwd(), 'public', 'generated-images');
    console.log('📁 Images directory:', imagesDir);
    
    try {
      await mkdir(imagesDir, { recursive: true });
      console.log('✅ Directory ensured');
    } catch (error) {
      console.log('ℹ️ Directory already exists or creation failed:', error);
    }
    
    // Save the image
    const filepath = join(imagesDir, filename);
    console.log('💾 Saving image to:', filepath);
    
    await writeFile(filepath, Buffer.from(imageBuffer));
    console.log('✅ Image saved successfully');
    
    // Return the public URL
    const publicUrl = `/generated-images/${filename}`;
    const fullUrl = `${baseUrl}${publicUrl}`;
    
    console.log('🎉 Daily image saved successfully:', filepath);
    
    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
      fullUrl
    });
  } catch (error) {
    console.error('❌ Error saving daily image:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { error: `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 