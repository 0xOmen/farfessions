import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  APP_BUTTON_TEXT, 
  APP_DESCRIPTION, 
  APP_ICON_URL, 
  APP_NAME, 
  APP_OG_IMAGE_URL, 
  APP_PRIMARY_CATEGORY, 
  APP_SPLASH_BACKGROUND_COLOR, 
  APP_TAGS, 
  APP_URL, 
  APP_WEBHOOK_URL,
  APP_TAGLINE,
  APP_OG_TITLE,
  APP_OG_DESCRIPTION,
  APP_HERO_IMAGE_URL
} from './constants';
import { APP_SPLASH_URL } from './constants';
import fs from 'fs';
import path from 'path';

interface FrameMetadata {
  version: string;
  name: string;
  iconUrl: string;
  homeUrl: string;
  imageUrl?: string;
  buttonTitle?: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
  webhookUrl?: string;
  description?: string;
  primaryCategory?: string;
  tags?: string[];
  subtitle?: string;
  tagline?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  heroImageUrl?: string;
  noindex?: boolean;
  requiredChains?: string[];
  requiredCapabilities?: string[];
};

interface FrameManifest {
  accountAssociation?: {
    header: string;
    payload: string;
    signature: string;
  };
  frame: FrameMetadata;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFrameEmbedMetadata(ogImageUrl?: string) {
  return {
    version: "next",
    imageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    button: {
      title: APP_BUTTON_TEXT,
      action: {
        type: "launch_frame",
        name: APP_NAME,
        url: APP_URL,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
        description: APP_DESCRIPTION,
        primaryCategory: APP_PRIMARY_CATEGORY,
        tags: APP_TAGS,
      },
    },
  };
}

export async function getFarcasterMetadata(): Promise<FrameManifest> {
  // First check for FRAME_METADATA in .env and use that if it exists
  if (process.env.FRAME_METADATA) {
    try {
      const metadata = JSON.parse(process.env.FRAME_METADATA);
      console.log('Using pre-signed frame metadata from environment');
      return metadata;
    } catch (error) {
      console.warn('Failed to parse FRAME_METADATA from environment:', error);
    }
  }

  // Read accountAssociation from static farcaster.json file
  let accountAssociation;
  try {
    const farcasterJsonPath = path.join(process.cwd(), 'public', '.well-known', 'farcaster.json');
    const farcasterJsonContent = fs.readFileSync(farcasterJsonPath, 'utf8');
    const farcasterJson = JSON.parse(farcasterJsonContent);
    accountAssociation = farcasterJson.accountAssociation;
    console.log('Using accountAssociation from farcaster.json');
  } catch (error) {
    console.warn('Failed to read accountAssociation from farcaster.json:', error);
  }

  if (!APP_URL) {
    throw new Error('NEXT_PUBLIC_URL not configured');
  }

  return {
    accountAssociation,
    frame: {
      version: "1",
      name: APP_NAME ?? "Farfessions",
      subtitle: "🤫 Spill the tea",
      iconUrl: APP_ICON_URL,
      homeUrl: APP_URL,
      imageUrl: APP_OG_IMAGE_URL,
      buttonTitle: APP_BUTTON_TEXT ?? "🤫 Share Secrets",
      splashImageUrl: APP_SPLASH_URL,
      splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      webhookUrl: APP_WEBHOOK_URL,
      description: APP_DESCRIPTION ?? "Anonymously share your confessions with the world. The top daily submission gets posted from the @Farfessions account.",
      primaryCategory: APP_PRIMARY_CATEGORY ?? "social",
      tags: ["confessions", "anonymous", "social", "farcaster"],
      tagline: APP_TAGLINE,
      ogTitle: APP_OG_TITLE,
      ogDescription: APP_OG_DESCRIPTION,
      ogImageUrl: APP_OG_IMAGE_URL,
      heroImageUrl: APP_HERO_IMAGE_URL,
      noindex: false,
      requiredChains: ["eip155:8453"],
      requiredCapabilities: [
        "actions.signIn",
        "wallet.getEthereumProvider",
        "actions.swapToken"
      ],
    },
  };
}
