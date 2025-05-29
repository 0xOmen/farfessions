import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function postTopSubmissions(period: 'daily' | 'weekly' = 'daily') {
  try {
    // Use production URL instead of localhost
    const baseUrl = 'https://farfessions.vercel.app';
    
    const response = await fetch(`${baseUrl}/api/post-top-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ period }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Top submissions posted successfully!');
    console.log('Cast URL:', result.castUrl);
    console.log('Image URL:', result.imageUrl);
  } catch (error) {
    console.error('❌ Error posting top submissions:', error);
  }
}

// Get period from command line argument
const period = process.argv[2] as 'daily' | 'weekly' || 'daily';
postTopSubmissions(period); 