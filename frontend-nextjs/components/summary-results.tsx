import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSearchStore } from '@/lib/store';
import { Chat } from '@/lib/chat-store';

interface SummaryResultsProps {
  currentChat?: Chat;
}

export function SummaryResults({ currentChat }: SummaryResultsProps) {
  const { summary: currentSummary, isSummarizing, error } = useSearchStore();
  
  // Use either the current summary or the stored one
  const summaryToShow = currentSummary || currentChat?.summary;

  if (isSummarizing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-ivory">
          Generating summary with AI...
        </div>
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
        <ReactMarkdown>{summaryToShow}</ReactMarkdown>
      </div>
    </div>
  );
} 