import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});

const client = new NeynarAPIClient(config);

async function createSigner() {
  try {
    console.log('Creating Neynar managed signer for FID:', process.env.FARFESSIONS_FID);
    
    // Create a managed signer
    const signerResponse = await client.createSigner();
    
    console.log('Signer created successfully!');
    console.log('Signer UUID:', signerResponse.signer_uuid);
    console.log('Public Key:', signerResponse.public_key);
    console.log('Status:', signerResponse.status);
    
    if (signerResponse.signer_approval_url) {
      console.log('\n🔗 IMPORTANT: You need to approve this signer!');
      console.log('Visit this URL with your farfessions account to approve:');
      console.log(signerResponse.signer_approval_url);
      console.log('\nAfter approval, add this to your .env.local:');
      console.log(`FARFESSIONS_SIGNER_UUID=${signerResponse.signer_uuid}`);
    }
    
    return signerResponse;
  } catch (error) {
    console.error('Error creating signer:', error);
    throw error;
  }
}

// Run the script
createSigner()
  .then(() => {
    console.log('\nSigner setup initiated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create signer:', error);
    process.exit(1);
  }); 