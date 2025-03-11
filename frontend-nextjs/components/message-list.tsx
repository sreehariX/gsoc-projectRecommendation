"use client";

import { Message } from '@/lib/chat-store';
import ReactMarkdown from 'react-markdown';

interface MessageListProps {
  messages: Message[];
  isGenerating?: boolean;
}

export function MessageList({ messages, isGenerating }: MessageListProps) {
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
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div 
                className={`inline-block px-4 py-2 max-w-[90%] ${
                  message.role === 'user' 
                    ? 'rounded-2xl rounded-br-sm bg-[var(--gradient-bg)]' 
                    : 'rounded-2xl rounded-bl-sm prose prose-invert'
                }`}
                style={{
                  color: 'white'
                }}
              >
                {message.role === 'user' ? (
                  message.content
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
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