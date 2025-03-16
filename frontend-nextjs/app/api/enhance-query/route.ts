import { NextRequest } from 'next/server';
import { enhanceQuery } from '@/lib/ai-service';

// required to make the API route work with static exports
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Use edge runtime for better performance

export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "API key not configured" }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await req.json();
    const { query } = body;
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const enhancedQuery = await enhanceQuery(query);
    
    return new Response(
      JSON.stringify({ enhancedQuery }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in enhance-query route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to enhance query" }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 