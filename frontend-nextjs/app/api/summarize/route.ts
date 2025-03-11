import { NextRequest, NextResponse } from 'next/server';
import { summarizeResults } from '@/lib/ai-service';
import { SearchResult } from '@/lib/api-service';

// Add this configuration to explicitly mark the route as dynamic
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { results } = body;
    
    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const summary = await summarizeResults(results as SearchResult[]);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error in summarize route:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
} 