import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from all possible locations
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(__dirname, '../../../.env'),
];

for (const p of envPaths) {
  dotenv.config({ path: p });
}
dotenv.config();

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, 'Missing NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Missing SUPABASE_SERVICE_ROLE_KEY'),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Missing NEXT_PUBLIC_FIREBASE_API_KEY'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: z.string().min(1, 'Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY'),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
});

if (!parsedEnv.success) {
  console.warn('⚠️ [Environment Warning] Missing or invalid variables:', parsedEnv.error.flatten().fieldErrors);
}

export const env = parsedEnv.success ? parsedEnv.data : process.env;
