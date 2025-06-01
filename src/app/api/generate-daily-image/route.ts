import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';
import { getFarfessionsWithUserVotes } from '~/lib/supabase';
import React from 'react';

export const runtime = 'edge';

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
            padding: '60px',
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
              maxWidth: '800px',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: '48px',
                fontWeight: 'normal',
                color: 'white',
                lineHeight: '1.4',
                marginBottom: '40px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              },
            },
            `"${topSubmission.text}"`
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: '32px',
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