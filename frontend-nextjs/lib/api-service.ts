// API service for handling backend requests

export interface SearchResult {
  document: string;
  metadata: {
    gsocorganization_dev_url: string;
    idea_list_url: string;
    organization_id: number;
    organization_name: string;
    no_of_ideas: number;
    totalCharacters_of_ideas_content_parent: number;
    totalTokenCount_of_ideas_content_parent: number;
    totalwords_of_ideas_content_parent: number;
  };
  similarity_score: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export async function searchProjects(query: string, n_results: number = 10): Promise<SearchResponse> {
  try {
    const response = await fetch('https://gsoc2025-fastapi-backend-usn9l.ondigitalocean.app/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, n_results }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching projects:', error);
    return { results: [] };
  }
}
