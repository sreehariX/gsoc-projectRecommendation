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

  // Function to handle link clicks
  const handleLinkClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = (target as HTMLAnchorElement).href;
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  if (isSummarizing && !summaryToShow) {
    return (
      <div className="flex items-center justify-center p-4 md:p-8">
        <div className="relative">
          <span className="text-sm md:text-base text-gray-400 animate-pulse">
            Generating response
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 rounded-lg --background: #1D1E1A;">
        <div className="text-sm md:text-base text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!summaryToShow) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 rounded-lg --background: #1D1E1A;" onClick={handleLinkClick}>
      <div className="prose prose-invert max-w-none text-ivory text-sm md:text-base">
        {isSummarizing && (
          <div className="mb-2 text-xs md:text-sm text-gray-400 relative">
            <span>Generating response</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        )}
        <ReactMarkdown 
          className="prose-headings:text-lg md:prose-headings:text-xl prose-p:text-sm md:prose-p:text-base"
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" />
            )
          }}
        >
          {summaryToShow}
        </ReactMarkdown>
      </div>
    </div>
  );
} 