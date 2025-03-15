import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSearchStore } from '@/lib/store';
import { Chat } from '@/lib/chat-store';

interface SummaryResultsProps {
  currentChat?: Chat;
}

export function SummaryResults({ currentChat }: SummaryResultsProps) {
  const { summary: currentSummary, isSummarizing, error } = useSearchStore();
  
  // Use either the current summary from the search store or the stored one from the chat
  const summaryToShow = currentSummary || currentChat?.summary;

  if (isSummarizing && !summaryToShow) {
    return (
      <div className="flex items-center justify-center p-8">
        
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg --background: #1D1E1A;">
        <div className="text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!summaryToShow) {
    return null;
  }

  return (
    <div className="p-6 rounded-lg --background: #1D1E1A;">
      <div className="prose prose-invert max-w-none text-ivory">
        {isSummarizing && (
          <div className="mb-2 text-sm text-gray-400">
          
          </div>
        )}
        <ReactMarkdown>{summaryToShow}</ReactMarkdown>
      </div>
    </div>
  );
} 