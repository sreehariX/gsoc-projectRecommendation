"use client";

import { Message } from '@/lib/chat-store';
import { useEffect, useState } from 'react';
import { remark } from 'remark';
import html from 'remark-html';

interface MessageListProps {
  messages: Message[];
  isGenerating?: boolean;
}

export function MessageList({ messages, isGenerating }: MessageListProps) {
  const [processedMessages, setProcessedMessages] = useState<(Message & { contentHtml?: string })[]>([]);

  useEffect(() => {
    const processMarkdown = async () => {
      // Ensure messages are processed in the correct order
      const processed = await Promise.all(
        messages.map(async (message) => {
          if (message.role === 'user') {
            return { ...message };
          }
          
          // Process markdown for assistant messages
          const processedContent = await remark()
            .use(html)
            .process(message.content);
          
          let contentHtml = processedContent.toString();
          
          // Add target="_blank" to all links
          contentHtml = contentHtml.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
          
          return {
            ...message,
            contentHtml
          };
        })
      );
      
      // Sort messages by timestamp to ensure correct order
      const sortedMessages = [...processed].sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      setProcessedMessages(sortedMessages);
    };
    
    processMarkdown();
  }, [messages]);

  // Function to handle link clicks
  const handleLinkClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = (target as HTMLAnchorElement).href;
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 md:max-w-3xl md:mx-auto" onClick={handleLinkClick}>
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <h1 className="text-2xl md:text-4xl font-bold text-center px-4" style={{ color: 'hsl(var(--color-silver))' }}>
            Search for GSoC projects
          </h1>
        </div>
      ) : (
        <>
          {processedMessages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 md:mb-6 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div 
                className={`inline-block px-3 py-2 md:px-4 md:py-2 max-w-[95%] md:max-w-[90%] ${
                  message.role === 'user' 
                    ? 'rounded-2xl rounded-br-sm bg-[var(--gradient-bg)]' 
                    : 'rounded-2xl rounded-bl-sm'
                }`}
                style={{
                  color: 'white'
                }}
              >
                {message.role === 'user' ? (
                  <div className="text-sm md:text-base">{message.content}</div>
                ) : (
                  <div 
                    className="prose prose-invert prose-headings:text-white prose-p:text-white prose-li:text-white prose-strong:text-white max-w-none text-sm md:text-base"
                    dangerouslySetInnerHTML={{ __html: message.contentHtml || '' }}
                  />
                )}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex items-center text-xs text-gray-400 animate-pulse px-2">
              Generating response...
            </div>
          )}
        </>
      )}
    </div>
  );
}