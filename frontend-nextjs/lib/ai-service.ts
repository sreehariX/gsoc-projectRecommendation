import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import { SearchResult } from './api-service';

// Create a Google provider instance with server-side API key
const createAIProvider = () => {
  // Use the server-side environment variable without NEXT_PUBLIC_ prefix
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Google Generative AI API key is missing');
  }

  return createGoogleGenerativeAI({
    apiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  });
};

export async function enhanceQuery(userQuery: string): Promise<string> {
  if (!userQuery || userQuery.trim() === '') {
    return userQuery;
  }

  try {
    const googleAI = createAIProvider();
    const model = googleAI('gemini-2.0-flash');

    const prompt = `
    You are a search query enhancer for a GSoC (Google Summer of Code) project search system.
    Your task is to improve the user's search query to make it more effective for semantic search in a vector database of GSoC projects.
    
    Original query: "${userQuery}"
    
    Enhance this query by:
    1. Expandin the user query to make it more accurate in vector database search
    2. Expanding abbreviations
    3. Including synonyms for technical terms
    4. Improving specificity while maintaining the original intent
    5. Dont include gsoc word in the enchaced query like gsoc project ideas etc
    
    Return ONLY the enhanced query text with no explanations or additional text.
    `;

    const result = await generateText({
      model,
      prompt,
    });

    return result.text.trim();
  } catch (error) {
    console.error("Error enhancing query:", error);
    // Return the original query as fallback
    return userQuery;
  }
}

export async function summarizeResults(results: SearchResult[]): Promise<Response> {
  if (!results || results.length === 0) {
    return new Response("No results found.");
  }

  try {
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

    const promptText = `
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
      const model = googleAI('gemini-2.0-flash');

      const result = await streamText({
        model,
        prompt: promptText,
        onError: (error) => {
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
      // When there's an error with the AI service, use the fallback
      const fallbackSummary = generateFallbackSummary(results);
      return new Response(fallbackSummary, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (error) {
    console.error("Error generating summary:", error);
    // Use fallback for any error in the summarization process
    const fallbackSummary = generateFallbackSummary(results);
    return new Response(fallbackSummary, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Helper function to create a nice fallback summary
function generateFallbackSummary(results: SearchResult[]): string {
  let summary = `# GSoC Project Ideas\n\n`;
  
  // Add notification about API key usage
  summary += `> **Note:** Our Gemini API keys usage limit is reached. We are using a fallback mechanism that shows exactly the same results but with simplified formatting. Thank you for your understanding.\n\n`;
  
  results.forEach((result, index) => {
    const score = (result.similarity_score * 100).toFixed(1);
    summary += `## ${index + 1}. ${result.metadata.organization_name} (${score}% match)\n\n`;
    
    // Add key information
    summary += `- **Number of Ideas**: ${result.metadata.no_of_ideas}\n`;
    summary += `- **Organization**: [Visit Organization](${result.metadata.gsocorganization_dev_url})\n`;
    summary += `- **Ideas List**: [View All Ideas](${result.metadata.idea_list_url})\n\n`;
    
    // Add document content directly
    summary += `### Project Details\n\n`;
    summary += `${result.document}\n\n`;
    
    summary += `---\n\n`;
  });
  
  return summary;
}

// Helper function to extract sections from a document
interface DocumentSection {
  title?: string;
  content: string;
}

function extractSectionsFromDocument(document: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  
  // Common section headers in GSoC idea documents
  const sectionHeaderRegexes = [
    /(?:^|\n)#+\s*(.*?)(?:\n|$)/,                     // Markdown headers
    /(?:^|\n)(.*?)\[edit.*?\](?:\n|$)/,               // Wiki-style headers with [edit]
    /(?:^|\n)(Description|Expected outcome|Required skills|Difficulty|Mentors|Project size):/i, // Common GSoC section labels
    /(?:^|\n)(Brief Explanation|Expected Results|Duration|Knowledge Prerequisites)(?:\[.*?\])?:/i // More GSoC sections
  ];
  
  // Split by empty lines first to get paragraphs
  const paragraphs = document.split(/\n\s*\n/);
  
  let currentSection: DocumentSection | null = null;
  
  paragraphs.forEach(paragraph => {
    paragraph = paragraph.trim();
    if (!paragraph) return;
    
    // Check if this paragraph is a header
    let isHeader = false;
    let headerTitle = '';
    
    for (const regex of sectionHeaderRegexes) {
      const match = paragraph.match(regex);
      if (match && match[1]) {
        isHeader = true;
        headerTitle = match[1].trim();
        break;
      }
    }
    
    if (isHeader) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        title: headerTitle,
        content: ''
      };
    } else if (currentSection) {
      // Add to current section content
      currentSection.content += paragraph + '\n\n';
    } else {
      // No section yet, create one without a title
      currentSection = {
        content: paragraph + '\n\n'
      };
    }
  });
  
  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
} 