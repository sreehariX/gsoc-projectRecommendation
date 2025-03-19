"use client";

import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Trash2, X } from 'lucide-react';
import { Chat } from '@/lib/chat-store';
import { SocialButtons } from '@/components/support-button';

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
      className={`${isOpen ? 'w-64' : 'w-0'} sidebar overflow-hidden h-full flex flex-col`}
      style={{
        backgroundColor: '#2b2b2b',
        color: 'hsl(var(--sidebar-foreground))'
      }}
    >
      <div className="p-4 flex items-center justify-between">
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
        
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-2 text-white hover:bg-[var(--button-ghost-hover)] rounded-full"
          onClick={() => {
            // This will be handled by the parent component
            // We're just adding the button here for UI purposes
            const event = new CustomEvent('closeMobileSidebar');
            window.dispatchEvent(event);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-2 flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-400">
            No chats yet. Start a new chat!
          </div>
        ) : (
          chats.map((chat) => (
            <div key={chat.id} className="relative group mb-1">
              <Button
                variant="ghost"
                className={`w-full justify-start text-left pr-8 rounded-2xl transition-colors duration-200
                  ${activeChat === chat.id ? 'bg-transparent' : 'bg-transparent'}
                  hover:bg-[hsla(var(--sidebar-accent))]`}
                style={{
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
          ))
        )}
      </div>
      
      <div className="p-3 border-t border-gray-700">
        <div className="mb-2 flex justify-center md:hidden">
          <SocialButtons isMobile={true} />
        </div>
        <p className="text-xs text-gray-400 text-center">Made with ❤️ by Sreehari</p>
      </div>
    </div>
  );
}