import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';
import { getFarfessionsWithUserVotes } from '~/lib/supabase';
import React from 'react';

export const runtime = 'edge';

// Function to calculate optimal font size based on text length
function calculateFontSize(textLength: number): { fontSize: number; lineHeight: number } {
  // Base font size for short text
  let fontSize = 48;
  let lineHeight = 1.4;
  
  // Adjust font size based on text length
  if (textLength > 800) {
    fontSize = 24;
    lineHeight = 1.2;
  } else if (textLength > 600) {
    fontSize = 28;
    lineHeight = 1.25;
  } else if (textLength > 400) {
    fontSize = 32;
    lineHeight = 1.3;
  } else if (textLength > 200) {
    fontSize = 36;
    lineHeight = 1.35;
  } else if (textLength > 100) {
    fontSize = 42;
    lineHeight = 1.4;
  }
  
  return { fontSize, lineHeight };
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎨 Starting daily image generation...');
    
    const { searchParams } = new URL(request.url);
    const adminFid = searchParams.get('adminFid');
    
    console.log('Admin FID received:', adminFid);
    
    // Verify admin access
    const ADMIN_FID = 212074;
    if (!adminFid || parseInt(adminFid) !== ADMIN_FID) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized: Only admin can generate daily images' },
        { status: 403 }
      );
    }

    console.log('✅ Admin access verified');

    // Get farfessions for admin (includes hidden ones)
    console.log('📊 Fetching farfessions...');
    const farfessions = await getFarfessionsWithUserVotes(ADMIN_FID);
    console.log(`Found ${farfessions.length} total farfessions`);
    
    // Filter to last 24 hours and find top submission
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const last24Hours = farfessions.filter(f => {
      const submissionDate = new Date(f.created_at);
      return submissionDate >= twentyFourHoursAgo && !f.is_hidden;
    });
    
    console.log(`Found ${last24Hours.length} submissions in last 24 hours`);
    
    if (last24Hours.length === 0) {
      console.log('❌ No submissions found in last 24 hours');
      return NextResponse.json(
        { error: 'No submissions found in the last 24 hours' },
        { status: 404 }
      );
    }
    
    // Sort by likes and get the top submission
    const topSubmission = last24Hours.sort((a, b) => b.likes - a.likes)[0];
    console.log(`🏆 Top submission: ${topSubmission.likes} likes, text: "${topSubmission.text.substring(0, 50)}..."`);

    // Calculate optimal font size based on text length
    const { fontSize, lineHeight } = calculateFontSize(topSubmission.text.length);
    console.log(`📏 Text length: ${topSubmission.text.length}, using fontSize: ${fontSize}px, lineHeight: ${lineHeight}`);

    console.log('🖼️ Generating image...');
    // Generate the image
    return new ImageResponse(
      React.createElement(
        'div',
        {
          style: {
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#8A63D2',
            padding: '40px',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              maxWidth: '1000px',
              width: '100%',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: 'normal',
                color: 'white',
                lineHeight: lineHeight.toString(),
                marginBottom: fontSize > 32 ? '40px' : '20px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                wordWrap: 'break-word',
                hyphens: 'auto',
                maxWidth: '100%',
              },
            },
            `"${topSubmission.text}"`
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: Math.max(24, Math.floor(fontSize * 0.67)) + 'px',
                color: 'white',
                fontStyle: 'italic',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              },
            },
            '~ Anonymous Farfession'
          )
        )
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('❌ Error generating daily image:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to generate image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 