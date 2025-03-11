import { create } from 'zustand';
import { SearchResult, searchProjects } from './api-service';

interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  search: () => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  isLoading: false,
  error: null,
  setQuery: (query) => set({ query }),
  search: async () => {
    const { query } = get();
    if (!query.trim()) return;
    
    set({ isLoading: true, error: null });
    try {
      const response = await searchProjects(query);
      set({ results: response.results, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to search projects', isLoading: false });
    }
  },
  clearResults: () => set({ results: [], query: '' }),
})); 