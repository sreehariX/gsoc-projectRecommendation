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
      
      // Generate summary
      if (response.results.length > 0) {
        set({ isSummarizing: true });
        try {
          const summary = await summarizeResults(response.results);
          set({ summary, isSummarizing: false });
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