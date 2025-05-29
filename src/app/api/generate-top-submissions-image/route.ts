import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { supabase } from '~/lib/supabase';
import React from 'react';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'daily';
    // Set limit based on period: 1 for daily, 3 for weekly
    const limit = period === 'daily' ? 1 : 3;

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    if (period === 'daily') {
      startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }

    // Fetch top submissions
    const { data: submissions, error } = await supabase
      .from('farfessions')
      .select('text, likes, created_at')
      .gte('created_at', startDate.toISOString())
      .order('likes', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching submissions:', error);
      return new Response('Error fetching submissions', { status: 500 });
    }

    if (!submissions || submissions.length === 0) {
      return new Response('No submissions found', { status: 404 });
    }

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
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }
        },
        React.createElement('div', {
          style: {
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '30px',
            textAlign: 'center',
          }
        }, period === 'daily' ? '🏆 Top Farfession' : '🤫 Top Farfessions'),
        React.createElement('div', {
          style: {
            fontSize: '24px',
            color: 'white',
            marginBottom: '40px',
            opacity: 0.9,
          }
        }, period === 'daily' ? 'Past 24 Hours' : 'Past Week'),
        React.createElement('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
            maxWidth: '800px',
          }
        }, ...submissions.map((submission, index) => 
          React.createElement('div', {
            key: index,
            style: {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }
          },
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              marginBottom: '10px',
            }
          },
          // Only show ranking number for weekly (multiple submissions)
          period === 'weekly' && React.createElement('div', {
            style: {
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
              marginRight: '15px',
            }
          }, `#${index + 1}`),
          React.createElement('div', {
            style: {
              fontSize: '20px',
              color: 'white',
              opacity: 0.8,
            }
          }, `👍 ${submission.likes} likes`)
          ),
          React.createElement('div', {
            style: {
              fontSize: '18px',
              color: 'white',
              lineHeight: 1.4,
              fontStyle: 'italic',
            }
          }, `"${submission.text.length > 200 ? submission.text.substring(0, 200) + '...' : submission.text}"`)
          )
        )),
        React.createElement('div', {
          style: {
            marginTop: '40px',
            fontSize: '16px',
            color: 'white',
            opacity: 0.7,
            textAlign: 'center',
          }
        }, 'farfessions.vercel.app')
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response('Error generating image', { status: 500 });
  }
} 