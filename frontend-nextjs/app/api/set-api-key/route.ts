import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// This is required to make the API route work with static exports
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = body;
    
    if (!apiKey || typeof apiKey !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate the API key by making a test request to Google AI API
    try {
      // You can implement a validation check here if needed
      // For example, make a minimal request to the Google AI API
      
      // For now, we'll just set a secure, HTTP-only cookie with the API key
      // This cookie will not be accessible from JavaScript
      const cookieStore = cookies();
      
      // Set a secure, HTTP-only cookie that expires in 30 days
      cookieStore.set('google_ai_api_key', apiKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      
      // Store the API key in the server environment for the current session
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
      
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (validationError) {
      console.error("API key validation error:", validationError);
      return new Response(
        JSON.stringify({ error: "Invalid API key. Please check and try again." }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Error in set-api-key route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process API key" }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 