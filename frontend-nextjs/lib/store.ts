import { create } from 'zustand';
import { SearchResult, searchProjects } from './api-service';
import { summarizeResults } from './ai-service';

interface SearchState {
  query: string;
  results: SearchResult[];
  summary: string;
  isLoading: boolean;
  isSummarizing: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  search: () => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  summary: '',
  isLoading: false,
  isSummarizing: false,
  error: null,
  setQuery: (query) => set({ query }),
  search: async () => {
    const { query } = get();
    if (!query.trim()) return;
    
    set({ isLoading: true, error: null, summary: '' });
    try {
      const response = await searchProjects(query);
      set({ results: response.results, isLoading: false });
      
      // Generate summary with streaming
      if (response.results.length > 0) {
        set({ isSummarizing: true });
        try {
          const res = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ results: response.results }),
          });

          if (!res.ok) {
            throw new Error('Failed to generate summary');
          }

          // Ensure we're handling the response as a stream
          if (!res.body) {
            throw new Error('Response body is null');
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let summary = '';

          set({ summary: '' }); // Reset summary before streaming

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            summary += chunk;
            
            // Update summary in real-time with each chunk
            set({ summary });
          }

          set({ isSummarizing: false });
        } catch (summaryError: any) {
          console.error("Summary generation error:", summaryError);
          set({ 
            error: summaryError.message || "Failed to generate summary", 
            isSummarizing: false 
          });
        }
      }
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to search projects', 
        isLoading: false,
        isSummarizing: false 
      });
    }
  },
  clearResults: () => set({ results: [], summary: '', query: '' }),
})); 