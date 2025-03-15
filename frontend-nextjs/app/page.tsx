"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { MessageList } from '@/components/message-list';
import { SummaryResults } from '@/components/summary-results';
import { PanelLeftOpen, PanelLeftClose, MessageSquarePlus, Search } from 'lucide-react';
import { Chat, Message, generateSyntheticResponse, generateChatTitle } from '@/lib/chat-store';
import { useSearchStore } from '@/lib/store';

import { chatStorageService } from '@/lib/chat-storage-service';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Initialize IndexedDB when the component mounts
  useEffect(() => {
    const initializeDB = async () => {
      try {
        console.log('Initializing IndexedDB...');
        await chatStorageService.initializeDB();
        console.log('IndexedDB initialized successfully');
        
        // Clean up chats older than 30 days
        try {
          await chatStorageService.cleanupOldChats();
          console.log('Old chats cleanup completed');
        } catch (cleanupError) {
          console.error('Error cleaning up old chats:', cleanupError);
        }
      } catch (error) {
        console.error('Error initializing IndexedDB:', error);
      }
    };
    
    initializeDB();
  }, []);

  // Load chats from storage on component mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        console.log('Loading chats from storage...');
        const storedChats = await chatStorageService.getAllChats();
        
        if (storedChats && storedChats.length > 0) {
          console.log(`Loaded ${storedChats.length} chats from storage`);
          
          // Initialize each chat with an empty results array
          const chatsWithEmptyResults = storedChats.map(chat => ({
            ...chat,
            results: [] // Initialize with empty results array
          }));
          
          setChats(chatsWithEmptyResults);
          
          // Set the most recent chat as active
          const sortedChats = [...chatsWithEmptyResults].sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          if (sortedChats.length > 0) {
            console.log(`Setting most recent chat as active: ${sortedChats[0].id}`);
            setActiveChat(sortedChats[0].id);
          }
        } else {
          console.log('No chats found in storage');
        }
      } catch (error) {
        console.error('Error loading chats from storage:', error);
      }
    };
    
    loadChats();
  }, []);

  // Save chat to storage when chats change
  useEffect(() => {
    const saveChats = async () => {
      if (chats.length > 0) {
        for (const chat of chats) {
          try {
            // Skip saving if the chat doesn't have an ID or is incomplete
            if (!chat.id || !chat.messages || chat.messages.length === 0) {
              console.warn('Skipping save for incomplete chat:', chat);
              continue;
            }
            
            // Skip automatic saving here - we'll handle it explicitly in handleSend
            // This prevents race conditions and duplicate saves
            // await chatStorageService.saveChat({
            //   ...chat,
            //   id: chat.id, // Ensure ID is preserved as the key
            // });
          } catch (error) {
            console.error('Error saving chat:', error);
          }
        }
      }
    };
    
    saveChats();
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
  // Add a lock to prevent multiple simultaneous requests
  const [isRequestLocked, setIsRequestLocked] = useState(false);

  const currentChat = chats.find(chat => chat.id === activeChat);

  // Add a function to explicitly save the current chat
  const saveCurrentChat = async (chatId: string) => {
    if (!chatId) return;
    
    const chatToSave = chats.find(chat => chat.id === chatId);
    if (chatToSave) {
      try {
        await chatStorageService.saveChat(chatToSave);
        console.log(`Explicitly saved chat: ${chatId}`);
      } catch (error) {
        console.error(`Error explicitly saving chat ${chatId}:`, error);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isRequestLocked) return;

    // Lock to prevent multiple simultaneous requests
    setIsRequestLocked(true);

    // Clear previous results but don't update the UI yet
    // This ensures the search starts fresh but doesn't affect the displayed messages
    clearResults();

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setQuery(input.trim());
    
    // Create or update the chat
    let currentActiveChatId: string;
    
    if (!activeChat) {
      // Create a new chat with the user message
      currentActiveChatId = Date.now().toString();
      const newChat: Chat = {
        id: currentActiveChatId,
        title: generateChatTitle(input.trim()),
        messages: [newMessage],
        createdAt: new Date(),
        results: [],
      };
      setChats(prev => [...prev, newChat]);
      setActiveChat(currentActiveChatId);
      console.log(`Created new chat with ID: ${currentActiveChatId}`);
    } else {
      currentActiveChatId = activeChat;
      // Update the chat with just the new user message first
      setChats(prev => prev.map(chat => {
        if (chat.id === currentActiveChatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage],
          };
        }
        return chat;
      }));
      console.log(`Updated existing chat with ID: ${currentActiveChatId}`);
    }

    setInput('');
    setIsFirstMessage(false);
    
    // Scroll to message start immediately after adding the message
    // This ensures scroll happens for each new query in the same chat
    setTimeout(() => {
      if (messagesStartRef.current) {
        messagesStartRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 0);
    
    setIsGenerating(true);
    
    try {
      // Store the current chat state before search to preserve previous messages
      const chatBeforeSearch = chats.find(chat => chat.id === currentActiveChatId);
      console.log(`Current active chat ID: ${currentActiveChatId}`);
      
      await search();
      
      console.log(`After search - Summary: ${summary ? summary.substring(0, 50) + '...' : 'No summary'}`);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: summary || 'No results found. Please try a different search.',
        timestamp: new Date(),
      };
      
      // Update the chat with the assistant message and store results/summary
      setChats(prev => {
        const updatedChats = prev.map(chat => {
          if (chat.id === currentActiveChatId) {
            // Get the current chat to ensure we have all messages
            const currentChat = prev.find(c => c.id === currentActiveChatId);
            
            // If we have the current chat, use its messages
            if (currentChat) {
              const updatedChat = {
                ...chat,
                messages: [...currentChat.messages, assistantMessage],
                summary: summary || '',
                // Keep results in memory but don't save to IndexedDB
                results: results || [],
              };
              console.log(`Updating chat ${currentActiveChatId} with summary: ${summary ? 'Yes' : 'No'}`);
              return updatedChat;
            }
            
            // Fallback to the chat before search if current chat is not found
            if (chatBeforeSearch) {
              const updatedChat = {
                ...chat,
                messages: [...chatBeforeSearch.messages, assistantMessage],
                summary: summary || '',
                // Keep results in memory but don't save to IndexedDB
                results: results || [],
              };
              console.log(`Fallback: Updating chat ${currentActiveChatId} with summary: ${summary ? 'Yes' : 'No'}`);
              return updatedChat;
            }
            
            // Last resort fallback
            const updatedChat = {
              ...chat,
              messages: [...chat.messages, assistantMessage],
              summary: summary || '',
              // Keep results in memory but don't save to IndexedDB
              results: results || [],
            };
            console.log(`Last resort: Updating chat ${currentActiveChatId} with summary: ${summary ? 'Yes' : 'No'}`);
            return updatedChat;
          }
          return chat;
        });
        return updatedChats;
      });
      
      // Explicitly save the chat after updating it
      // Use a longer delay to ensure the state has been updated
      setTimeout(async () => {
        try {
          // Get the latest version of the chat from state - this is causing the issue
          // as it's using the stale state from the closure
          const chatToSave = chats.find(chat => chat.id === currentActiveChatId);
          
          // Get the latest summary value directly from the store
          const currentSummary = useSearchStore.getState().summary;
          
          if (chatToSave) {
            console.log(`Saving chat ${currentActiveChatId} with summary: ${currentSummary ? 'Yes' : 'No'}`);
            console.log(`Chat to save: ID=${chatToSave.id}, Title=${chatToSave.title}, Messages=${chatToSave.messages.length}`);
            
            // Get the latest messages directly from the DOM state
            const updatedChat = {
              ...chatToSave,
              // Ensure we're using the latest summary value from the store
              messages: chatToSave.messages.map(msg => {
                // If this is the assistant's last message, ensure it has the latest summary
                if (msg.role === 'assistant' && msg === chatToSave.messages[chatToSave.messages.length - 1]) {
                  return {
                    ...msg,
                    content: currentSummary || 'No results found. Please try a different search.'
                  };
                }
                return msg;
              })
            };
            
            await chatStorageService.saveChat(updatedChat);
            console.log(`Successfully saved chat ${currentActiveChatId} with summary`);
          } else {
            console.error(`Could not find chat ${currentActiveChatId} in current state to save`);
            
            // Fallback: Create a new chat object with the current data
            const fallbackChat: Chat = {
              id: currentActiveChatId,
              title: input.trim().substring(0, 50) + (input.trim().length > 50 ? '...' : ''),
              messages: [
                newMessage,
                {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: currentSummary || 'No results found. Please try a different search.',
                  timestamp: new Date(),
                }
              ],
              createdAt: new Date(),
              summary: currentSummary || '',
              results: []
            };
            
            console.log(`Saving fallback chat: ${fallbackChat.id}`);
            await chatStorageService.saveChat(fallbackChat);
            console.log(`Successfully saved fallback chat ${currentActiveChatId}`);
            
            // Update the state with the fallback chat
            setChats(prev => {
              // Check if the chat already exists in state
              const chatExists = prev.some(chat => chat.id === currentActiveChatId);
              
              if (chatExists) {
                // Update the existing chat
                return prev.map(chat => 
                  chat.id === currentActiveChatId ? fallbackChat : chat
                );
              } else {
                // Add the new chat
                return [...prev, fallbackChat];
              }
            });
          }
        } catch (error) {
          console.error(`Error saving chat ${currentActiveChatId}:`, error);
        }
      }, 1000); // Increased timeout to ensure state is updated
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsGenerating(false);
      // Unlock requests
      setIsRequestLocked(false);
    }
  };

  const handleNewChat = () => {
    // Prevent creating new chat during an active request
    if (isRequestLocked) return;
    
    setActiveChat(null);
    setIsFirstMessage(true);
    
    // Clear the search results with a small delay to prevent UI flicker
    setTimeout(() => {
      clearResults();
    }, 50);
  };

  const handleSelectChat = async (id: string) => {
    // Prevent switching chats during an active request
    if (isRequestLocked) return;
    
    console.log(`Selecting chat: ${id}`);
    
    // Find the selected chat
    const selectedChat = chats.find(chat => chat.id === id);
    
    if (selectedChat) {
      console.log(`Found selected chat: ${id}`);
      console.log(`Selected chat summary exists: ${selectedChat.summary ? 'Yes' : 'No'}`);
      
      // Set the active chat first
      setActiveChat(id);
      setIsFirstMessage(false);
      
      // Get the last user message for the query field
      const lastUserMessage = selectedChat.messages
        .filter(msg => msg.role === 'user')
        .pop();
      
      if (lastUserMessage) {
        setQuery(lastUserMessage.content);
      }
      
      // Try to load the chat from storage to ensure we have the latest version
      try {
        const storedChat = await chatStorageService.getChat(id);
        if (storedChat) {
          console.log(`Loaded stored chat: ${id}`);
          console.log(`Stored chat summary exists: ${storedChat.summary ? 'Yes' : 'No'}`);
          
          // Update the chat in the state with the stored version
          setChats(prev => prev.map(chat => {
            if (chat.id === id) {
              // Preserve the existing results in memory if they exist
              const existingResults = chat.results || [];
              
              return {
                ...storedChat,
                // Ensure dates are properly converted
                createdAt: new Date(storedChat.createdAt),
                messages: storedChat.messages.map(msg => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                })),
                // Ensure summary is preserved
                summary: storedChat.summary || '',
                // Keep existing results in memory
                results: existingResults
              };
            }
            return chat;
          }));
        }
      } catch (error) {
        console.error(`Error loading chat ${id} from storage:`, error);
      }
      
      // Clear the search results to avoid showing results from previous chat
      // But do it after a small delay to prevent UI flicker
      setTimeout(() => {
        clearResults();
      }, 50);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    // Prevent deleting chat during an active request
    if (isRequestLocked) return;
    
    try {
      await chatStorageService.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (activeChat === chatId) {
        setActiveChat(null);
        setIsFirstMessage(true);
        
        // Clear the search results with a small delay to prevent UI flicker
        setTimeout(() => {
          clearResults();
        }, 50);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  useEffect(() => {
    return () => {
      clearResults();
    };
  }, []);

  // Save active chat to storage when it changes
  useEffect(() => {
    if (!activeChat) return;
    
    // Find the current active chat
    const currentChat = chats.find(chat => chat.id === activeChat);
    if (!currentChat) {
      console.log(`Active chat ${activeChat} not found in chats array`);
      return;
    }
    
    console.log(`Active chat changed: ${activeChat}, messages: ${currentChat.messages.length}`);
    
    // Don't automatically save on every state change
    // This prevents race conditions and ensures we only save complete chats
    // Saving is now handled explicitly in the handleSend function
    /*
    // Only save if we have messages
    if (currentChat.messages.length > 0) {
      console.log(`Saving chat ${activeChat} to storage`);
      
      // Create a version of the chat without results for storage
      const chatForStorage = {
        ...currentChat,
        results: [] // Don't save results to IndexedDB
      };
      
      chatStorageService.saveChat(chatForStorage)
        .then(() => console.log(`Successfully saved chat ${activeChat}`))
        .catch(error => console.error(`Error saving chat ${activeChat}:`, error));
    }
    */
  }, [activeChat, chats]);

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

        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto" 
          style={{ backgroundColor: 'var(--background)' }}
        >
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