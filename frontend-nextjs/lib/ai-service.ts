import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
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

export async function summarizeResults(results: SearchResult[]): Promise<string> {
  if (!results || results.length === 0) {
    return "No results found.";
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
As a GSoC project advisor, analyze and summarize these project results in a clear README format.
Focus on helping students understand:
1. format the document well
2. show technical requirements and difficulty and hours
3. Show both ideal list and organization url ate the end of each project
4. show the ideas in order with numbered bullet and dont miss any infromation that has give to you 

Format the summary with markdown headings, bullet points, and clear sections.
so that i can be easy to render on frontend

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

    const { text } = await generateText({
      model,
      prompt,
    });

    return text;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error; // Re-throw to handle in the store
  }
} 