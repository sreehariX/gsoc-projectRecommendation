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

export async function searchProjects(query: string): Promise<SearchResponse> {
  try {
    const response = await fetch('http://localhost:8000/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
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
