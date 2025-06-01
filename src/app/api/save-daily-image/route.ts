import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { adminFid } = await request.json();
    
    // Verify admin access
    const ADMIN_FID = 212074;
    if (!adminFid || adminFid !== ADMIN_FID) {
      return NextResponse.json(
        { error: 'Unauthorized: Only admin can save daily images' },
        { status: 403 }
      );
    }

    // Generate the image by calling our image generation API
    const imageResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/generate-daily-image?adminFid=${adminFid}`,
      { method: 'GET' }
    );

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json();
      throw new Error(errorData.error || 'Failed to generate image');
    }

    // Get the image buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Create filename with current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `daily-farfession-${today}.png`;
    
    // Ensure the images directory exists
    const imagesDir = join(process.cwd(), 'public', 'generated-images');
    try {
      await mkdir(imagesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }
    
    // Save the image
    const filepath = join(imagesDir, filename);
    await writeFile(filepath, Buffer.from(imageBuffer));
    
    // Return the public URL
    const publicUrl = `/generated-images/${filename}`;
    
    console.log(`Daily image saved: ${filepath}`);
    
    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
      fullUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${publicUrl}`
    });
  } catch (error) {
    console.error('Error saving daily image:', error);
    return NextResponse.json(
      { error: `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 