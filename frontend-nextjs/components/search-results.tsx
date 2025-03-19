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
          className="border border-gray-700 rounded-xl p-4 transition-all duration-200 hover:border-gray-500"
        >
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">
                {result.metadata.organization_name}
              </h3>
              <span className="text-sm px-2 py-1 bg-blue-900/50 rounded-full text-blue-300">
                {(result.similarity_score * 100).toFixed(1)}% match
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 text-sm mb-3">
              <a 
                href={result.metadata.gsocorganization_dev_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline hover:text-blue-300 transition-colors"
              >
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Organization Page
                </span>
              </a>
              <span className="text-gray-400">|</span>
              <a 
                href={result.metadata.idea_list_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline hover:text-blue-300 transition-colors"
              >
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Ideas List
                </span>
              </a>
            </div>
            
            <div className="inline-flex items-center text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded-md">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{result.metadata.no_of_ideas} ideas available</span>
            </div>
          </div>
          
          <div className="prose prose-sm prose-invert max-w-none border-t border-gray-700 pt-3 mt-2">
            <ReactMarkdown>
              {result.document}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
} 