import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import { SearchResult } from './api-service';

// Create a Google provider instance with explicit API key
const createAIProvider = () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Google Generative AI API key is missing');
  }

  return createGoogleGenerativeAI({
    apiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  });
};

export async function summarizeResults(results: SearchResult[]): Promise<Response> {
  if (!results || results.length === 0) {
    return new Response("No results found.");
  }

  // Format the results into a structured text
  const formattedResults = results.map((result, index) => {
    return `
Project ${index + 1}: ${result.metadata.organization_name}
Document: ${result.document}
Organization URL: ${result.metadata.gsocorganization_dev_url}
Ideas List: ${result.metadata.idea_list_url}
Number of Ideas: ${result.metadata.no_of_ideas}
Similarity Score: ${(result.similarity_score * 100).toFixed(1)}%
`;
  }).join("\n");

  const prompt = `
As a GSoC project advisor, analyze and summarize these project 
Focus on helping students understand:
1.format each idea for easy user understanding
- project name
- project description
- project technologies
- project difficulty & duration
- extra information
- url of the idea list and organization url should be clickable


2. show the ideas in order with numbered bullet and dont miss any infromation that has give to you 

3. Strictly Skip any introductory text like "GSoC Project Ideas Summary" or "Here's a summary of the provided GSoC project ideas" etc just start from project 1

4. Format the summary with markdown headings, bullet points, and clear sections.
so that it is  easy to render on frontend


Here are the projects to analyze:

${formattedResults}
`;

  try {
    const googleAI = createAIProvider();
    const model = googleAI('gemini-2.0-flash', {
      safetySettings: [
        { 
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    });

    // Use streamText with error handling
    try {
      const result = await streamText({
        model,
        prompt,
        onError: ({ error }) => {
          console.error("Error in streamText:", error);
        }
      });

      if (!result || !result.toTextStreamResponse) {
        throw new Error("Failed to generate text stream response");
      }

      // Return a streaming response directly
      return result.toTextStreamResponse();
    } catch (streamError) {
      console.error("Error in streamText:", streamError);
      return new Response("Failed to generate summary. Please try again later.", { status: 500 });
    }
  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response("Failed to generate summary. Please try again later.", { status: 500 });
  }
} 