import { Chat, Message } from './chat-store';

// Database configuration
const DB_NAME = 'chat_history_db';
const DB_VERSION = 1;
const CHAT_STORE_NAME = 'chats';
const MAX_AGE_DAYS = 30;

// Interface for the storage service
export interface ChatStorageService {
  initializeDB: () => Promise<void>;
  saveChat: (chat: Chat) => Promise<void>;
  getAllChats: () => Promise<Chat[]>;
  getChat: (id: string) => Promise<Chat | undefined>;
  deleteChat: (id: string) => Promise<void>;
  cleanupOldChats: () => Promise<void>;
}

/**
 * Chat Storage Service that uses both localStorage and IndexedDB
 * for persistent chat history with 30-day retention
 */
export const chatStorageService: ChatStorageService = {
  // Initialize the IndexedDB database
  initializeDB: async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = () => {
        console.log('IndexedDB initialized successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
          const store = db.createObjectStore(CHAT_STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('Chat store created');
        }
      };
    });
  },

  // Save chat to both localStorage and IndexedDB
  saveChat: async (chat: Chat): Promise<void> => {
    // First save to localStorage for quick access
    try {
      const savedChats = localStorage.getItem('chats');
      let chats: Chat[] = [];
      
      if (savedChats) {
        chats = JSON.parse(savedChats);
        
        // Find and update existing chat if it exists
        const existingIndex = chats.findIndex(c => c.id === chat.id);
        if (existingIndex >= 0) {
          chats[existingIndex] = chat;
        } else {
          chats.push(chat);
        }
      } else {
        chats = [chat];
      }
      
      localStorage.setItem('chats', JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    // Then save to IndexedDB for long-term storage
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([CHAT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CHAT_STORE_NAME);
        
        const request = store.put(chat);
        
        request.onerror = () => {
          reject(new Error('Failed to save chat to IndexedDB'));
        };
        
        request.onsuccess = () => {
          resolve();
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      };
    });
  },

  // Get all chats from IndexedDB
  getAllChats: async (): Promise<Chat[]> => {
    // First try to get from localStorage for speed
    try {
      const savedChats = localStorage.getItem('chats');
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        // Convert string dates back to Date objects
        return parsedChats.map((chat: Chat) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          messages: chat.messages.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
      }
    } catch (error) {
      console.error('Error retrieving from localStorage:', error);
    }
    
    // Fallback to IndexedDB
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([CHAT_STORE_NAME], 'readonly');
        const store = transaction.objectStore(CHAT_STORE_NAME);
        const request = store.getAll();
        
        request.onerror = () => {
          reject(new Error('Failed to retrieve chats from IndexedDB'));
        };
        
        request.onsuccess = () => {
          const chats = request.result;
          // Ensure proper Date objects
          const processedChats = chats.map((chat: Chat) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            messages: chat.messages.map((msg: Message) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }));
          resolve(processedChats);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      };
    });
  },

  // Get a specific chat by ID
  getChat: async (id: string): Promise<Chat | undefined> => {
    // Try localStorage first
    try {
      const savedChats = localStorage.getItem('chats');
      if (savedChats) {
        const chats = JSON.parse(savedChats);
        const chat = chats.find((c: Chat) => c.id === id);
        if (chat) {
          return {
            ...chat,
            createdAt: new Date(chat.createdAt),
            messages: chat.messages.map((msg: Message) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          };
        }
      }
    } catch (error) {
      console.error('Error retrieving chat from localStorage:', error);
    }
    
    // Fallback to IndexedDB
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([CHAT_STORE_NAME], 'readonly');
        const store = transaction.objectStore(CHAT_STORE_NAME);
        const request = store.get(id);
        
        request.onerror = () => {
          reject(new Error('Failed to retrieve chat from IndexedDB'));
        };
        
        request.onsuccess = () => {
          if (!request.result) {
            resolve(undefined);
            return;
          }
          
          const chat = request.result;
          // Ensure proper Date objects
          const processedChat = {
            ...chat,
            createdAt: new Date(chat.createdAt),
            messages: chat.messages.map((msg: Message) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          };
          resolve(processedChat);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      };
    });
  },

  // Delete a chat from both localStorage and IndexedDB
  deleteChat: async (id: string): Promise<void> => {
    // Delete from localStorage
    try {
      const savedChats = localStorage.getItem('chats');
      if (savedChats) {
        const chats = JSON.parse(savedChats);
        const filteredChats = chats.filter((c: Chat) => c.id !== id);
        localStorage.setItem('chats', JSON.stringify(filteredChats));
      }
    } catch (error) {
      console.error('Error deleting chat from localStorage:', error);
    }
    
    // Delete from IndexedDB
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([CHAT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CHAT_STORE_NAME);
        const request = store.delete(id);
        
        request.onerror = () => {
          reject(new Error('Failed to delete chat from IndexedDB'));
        };
        
        request.onsuccess = () => {
          resolve();
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      };
    });
  },

  // Cleanup chats older than 30 days
  cleanupOldChats: async (): Promise<void> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MAX_AGE_DAYS);
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([CHAT_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CHAT_STORE_NAME);
        const index = store.index('createdAt');
        
        // Get all chats created before the cutoff date
        const range = IDBKeyRange.upperBound(thirtyDaysAgo);
        const cursorRequest = index.openCursor(range);
        
        cursorRequest.onerror = () => {
          reject(new Error('Failed to cleanup old chats'));
        };
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
        
        transaction.oncomplete = () => {
          // Also cleanup localStorage (only keep what's in IndexedDB)
          chatStorageService.getAllChats().then(idbChats => {
            try {
              localStorage.setItem('chats', JSON.stringify(idbChats));
            } catch (error) {
              console.error('Error updating localStorage during cleanup:', error);
            }
            db.close();
            resolve();
          }).catch(error => {
            console.error('Error retrieving chats during cleanup:', error);
            db.close();
            reject(error);
          });
        };
      };
    });
  }
}; 