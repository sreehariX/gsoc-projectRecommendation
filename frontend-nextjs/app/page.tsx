"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { MessageList } from '@/components/message-list';
import { SummaryResults } from '@/components/summary-results';
import { PanelLeftOpen, PanelLeftClose, MessageSquarePlus, Search } from 'lucide-react';
import { Chat, Message, generateSyntheticResponse, generateChatTitle } from '@/lib/chat-store';
import { useSearchStore } from '@/lib/store';
import { SearchBar } from '@/components/search-bar';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Search state from Zustand store
  const { 
    query, 
    results, 
    summary, 
    isLoading, 
    isSummarizing, 
    setQuery, 
    search, 
    clearResults 
  } = useSearchStore();

  // Load chats from localStorage on initial load
  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        // Convert string dates back to Date objects
        const chatsWithDates = parsedChats.map((chat: Chat) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          messages: chat.messages.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChats(chatsWithDates);
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('chats', JSON.stringify(chats));
    }
  }, [chats]);

  // Scroll to top of messages when active chat changes
  useEffect(() => {
    if (messagesStartRef.current) {
      messagesStartRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Check if API key is configured
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY) {
      console.warn('Google Generative AI API key is not configured. Summary feature will not work.');
    } else {
      console.log('Google Generative AI API key is configured.');
    }
  }, []);

  // Add a loading state for response generation
  const [isGenerating, setIsGenerating] = useState(false);

  const currentChat = chats.find(chat => chat.id === activeChat);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setQuery(input.trim());
    
    if (!activeChat) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: generateChatTitle(input.trim()),
        messages: [newMessage],
        createdAt: new Date(),
        results: [],
      };
      setChats(prev => [...prev, newChat]);
      setActiveChat(newChat.id);
    } else {
      setChats(prev => prev.map(chat => {
        if (chat.id === activeChat) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage],
          };
        }
        return chat;
      }));
    }

    setInput('');
    setIsFirstMessage(false);
    setIsGenerating(true);
    
    try {
      await search();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: summary || 'No results found. Please try a different search.',
        timestamp: new Date(),
      };
      
      setChats(prev => prev.map(chat => {
        if (chat.id === activeChat) {
          return {
            ...chat,
            messages: [...chat.messages, assistantMessage],
            results: results,
            summary: summary,
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setIsFirstMessage(true);
    clearResults();
  };

  const handleSelectChat = (id: string) => {
    clearResults();
    
    const selectedChat = chats.find(chat => chat.id === id);
    if (selectedChat) {
      const lastUserMessage = selectedChat.messages
        .filter(msg => msg.role === 'user')
        .pop();
      if (lastUserMessage) {
        setQuery(lastUserMessage.content);
      }
    }
    
    setActiveChat(id);
    setIsFirstMessage(false);
  };

  const handleDeleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChat === chatId) {
      setActiveChat(null);
      setIsFirstMessage(true);
      clearResults();
    }
  };

  useEffect(() => {
    return () => {
      clearResults();
    };
  }, []);

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar 
        isOpen={isSidebarOpen}
        chats={chats}
        activeChat={activeChat}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />
      
      <div className={`flex-1 flex flex-col ${!isSidebarOpen ? 'mx-auto max-w-5xl' : ''}`}>
        <div className="h-14 flex items-center px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-white hover:bg-[var(--button-ghost-hover)] rounded-full"
            >
              {isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
            
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="text-white hover:bg-[var(--button-ghost-hover)] rounded-full"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          {currentChat && (
            <h2 className="ml-4 font-semibold truncate text-white">
              {currentChat.title}
            </h2>
          )}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--background)' }}>
          <div ref={messagesStartRef} className="pt-4" />
          <MessageList 
            messages={currentChat?.messages || []} 
            isGenerating={isGenerating}
          />
          
          {/* Summary Results - Pass currentChat as prop */}
          {activeChat && (
            <div className="max-w-3xl mx-auto px-4 pb-6">
              <SummaryResults 
                currentChat={currentChat}
              />
            </div>
          )}
        </div>

        <div className={`p-6 ${isFirstMessage ? 'flex items-center justify-center h-32' : ''}`}>
          <div className="max-w-3xl w-full mx-auto relative">
            <div className="relative flex items-end rounded-2xl bg-[rgba(50,50,50,0.6)] border border-[rgba(255,255,255,0.1)] focus-within:border-[rgba(255,255,255,0.3)] focus-within:shadow-glow transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search for GSoC projects..."
                className="w-full py-3 px-4 text-white bg-transparent rounded-2xl resize-none"
                style={{
                  minHeight: '60px',
                  maxHeight: '120px',
                  outline: 'none',
                  lineHeight: '1.5',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                className="absolute right-2 bottom-2 h-10 w-10 p-0 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.25)] transition-colors"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Search className="h-5 w-5 text-white" />
              </Button>
            </div>
            <div className="text-xs text-gray-400 mt-2 ml-2">
              Press Enter to search, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}