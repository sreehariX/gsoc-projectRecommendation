"use client";

import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { Chat } from '@/lib/chat-store';

interface SidebarProps {
  isOpen: boolean;
  chats: Chat[];
  activeChat: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export function Sidebar({ 
  isOpen, 
  chats, 
  activeChat, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat 
}: SidebarProps) {
  return (
    <div 
      className={`${isOpen ? 'w-64' : 'w-0'} sidebar overflow-hidden`}
      style={{
        backgroundColor: '#2b2b2b',
        color: 'hsl(var(--sidebar-foreground))'
      }}
    >
      <div className="p-4">
        <Button
          className="w-full justify-start gap-2 text-white rounded-full whitespace-nowrap"
          style={{
            backgroundColor: 'hsl(var(--sidebar-accent))',
            color: 'hsl(var(--sidebar-accent-foreground))'
          }}
          onClick={onNewChat}
        >
          <MessageSquarePlus className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">New Chat</span>
        </Button>
      </div>

      <div className="px-2 flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div key={chat.id} className="relative group mb-1">
            <Button
              variant={activeChat === chat.id ? "secondary" : "ghost"}
              className="w-full justify-start text-left pr-8 rounded-lg"
              style={{
                backgroundColor: activeChat === chat.id 
                  ? 'hsl(var(--sidebar-accent))' 
                  : 'transparent',
                color: 'hsl(var(--sidebar-foreground))'
              }}
              onClick={() => onSelectChat(chat.id)}
            >
              <span className="truncate">{chat.title}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
              style={{
                color: 'hsl(var(--sidebar-foreground))'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}