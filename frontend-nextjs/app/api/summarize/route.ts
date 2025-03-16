import { NextRequest } from 'next/server';
import { summarizeResults } from '@/lib/ai-service';
import { SearchResult } from '@/lib/api-service';
import { cookies } from 'next/headers';

// This is required to make the API route work with static exports
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Use edge runtime for better streaming support

export async function POST(req: NextRequest) {
  // Check for API key in environment variables first
  let apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  // If not found, try to get it from the secure cookie
  if (!apiKey) {
    const cookieStore = cookies();
    apiKey = cookieStore.get('google_ai_api_key')?.value;
    
    // If found in cookie, set it in the environment for this request
    if (apiKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }
  }
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key not configured. Please set your API key in the settings." }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await req.json();
    const { results } = body;
    
    if (!results || !Array.isArray(results)) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the streaming response directly from summarizeResults
    return await summarizeResults(results as SearchResult[]);
  } catch (error) {
    console.error("Error in summarize route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 