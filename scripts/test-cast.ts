import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});

const client = new NeynarAPIClient(config);

async function testCast() {
  try {
    const response = await client.publishCast({
      signerUuid: process.env.FARFESSIONS_SIGNER_UUID!,
      text: "Test cast from Farfessions bot! 🤖",
    });
    
    console.log('Test cast successful!');
    console.log('Cast hash:', response.cast.hash);
    console.log('Cast URL:', `https://warpcast.com/farfessions/${response.cast.hash.slice(0, 10)}`);
  } catch (error) {
    console.error('Test cast failed:', error);
  }
}

testCast(); 