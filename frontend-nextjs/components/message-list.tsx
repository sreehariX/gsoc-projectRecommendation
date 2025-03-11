"use client";

import { Message } from '@/lib/chat-store';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="max-w-3xl mx-auto p-4">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <h1 className="text-4xl font-bold" style={{ color: 'hsl(var(--color-silver))' }}>
            Search for GSoC projects
          </h1>
        </div>
      ) : (
        messages.map((message) => (
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
              {message.content}
            </div>
            <div className="text-xs mt-1" style={{ color: 'hsl(var(--color-steel))' }}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}