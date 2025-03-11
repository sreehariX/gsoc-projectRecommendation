import React from 'react';
import { SearchResult } from '@/lib/api-service';
import ReactMarkdown from 'react-markdown';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
}

export function SearchResults({ results, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {results.map((result, index) => (
        <div 
          key={index} 
          className="border border-gray-700 rounded-xl p-4"
        >
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-white mb-1">
              {result.metadata.organization_name}
            </h3>
            <div className="flex flex-wrap gap-2 text-sm mb-2">
              <a 
                href={result.metadata.gsocorganization_dev_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Organization Page
              </a>
              <span className="text-gray-400">|</span>
              <a 
                href={result.metadata.idea_list_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Ideas List
              </a>
            </div>
            <div className="text-xs text-gray-400 flex gap-2">
              <span>Ideas: {result.metadata.no_of_ideas}</span>
              <span>•</span>
              <span>Score: {(result.similarity_score * 100).toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>
              {result.document}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
} 