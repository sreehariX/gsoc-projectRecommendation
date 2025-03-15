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
      const processed = await Promise.all(
        messages.map(async (message) => {
          if (message.role === 'user') {
            return { ...message };
          }
          
          // Process markdown for assistant messages
          const processedContent = await remark()
            .use(html)
            .process(message.content);
          
          const contentHtml = processedContent.toString();
          
          return {
            ...message,
            contentHtml
          };
        })
      );
      
      setProcessedMessages(processed);
    };
    
    processMarkdown();
  }, [messages]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <h1 className="text-4xl font-bold" style={{ color: 'hsl(var(--color-silver))' }}>
            Search for GSoC projects
          </h1>
        </div>
      ) : (
        <>
          {processedMessages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div 
                className={`inline-block px-4 py-2 max-w-[90%] ${
                  message.role === 'user' 
                    ? 'rounded-2xl rounded-br-sm bg-[var(--gradient-bg)]' 
                    : 'rounded-2xl rounded-bl-sm'
                }`}
                style={{
                  color: 'white'
                }}
              >
                {message.role === 'user' ? (
                  message.content
                ) : (
                  <div 
                    className="prose prose-invert prose-headings:text-white prose-p:text-white prose-li:text-white prose-strong:text-white max-w-none"
                    dangerouslySetInnerHTML={{ __html: message.contentHtml || '' }}
                  />
                )}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex items-center text-xs text-gray-400 animate-pulse">
              Generating response...
            </div>
          )}
        </>
      )}
    </div>
  );
}