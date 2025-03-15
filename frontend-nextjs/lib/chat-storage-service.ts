import { Chat, Message } from "./chat-store";
import { IndexedDBProvider } from "./HistoryProviders/IndexedDB";
import { Answers } from "./HistoryProviders/IProvider";

// Use consistent database name and store name
const DB_NAME = "chat_history_db";
const STORE_NAME = "chats";

class ChatStorageService {
    private provider = new IndexedDBProvider(DB_NAME, STORE_NAME);
    
    async initializeDB(): Promise<void> {
        await this.provider.initializeDB();
    }
    
    async saveChat(chat: Chat): Promise<void> {
        if (!chat || !chat.id || !chat.messages || chat.messages.length === 0) {
            console.error("Cannot save chat: Invalid chat or missing data");
            return;
        }
        
        try {
            // Convert the chat to the format expected by the IndexedDB provider
            const answers: Answers = [];
            
            // Group messages by user-assistant pairs
            for (let i = 0; i < chat.messages.length; i += 2) {
                const userMessage = chat.messages[i];
                const assistantMessage = i + 1 < chat.messages.length ? chat.messages[i + 1] : null;
                
                if (userMessage && userMessage.role === 'user') {
                    const pair: [string, any] = [
                        userMessage.content,
                        assistantMessage ? assistantMessage.content : null
                    ];
                    answers.push(pair);
                }
            }
            
            if (answers.length === 0) {
                // Fallback: If we couldn't create pairs, just use the first message
                const firstMessage = chat.messages[0];
                answers.push([firstMessage.content, null]);
            }
            
            console.log(`Saving chat ${chat.id} with ${answers.length} message pairs`);
            await this.provider.addItem(chat.id, answers);
        } catch (error) {
            console.error("Error saving chat:", error);
        }
    }
    
    async getChat(id: string): Promise<Chat | null> {
        try {
            const answers = await this.provider.getItem(id);
            if (!answers) return null;
            
            // Convert the answers back to a Chat object
            const messages: Message[] = [];
            
            answers.forEach(([userContent, assistantContent], index) => {
                // Add user message
                messages.push({
                    id: `${id}-user-${index}`,
                    role: 'user',
                    content: userContent,
                    timestamp: new Date()
                });
                
                // Add assistant message if it exists
                if (assistantContent) {
                    messages.push({
                        id: `${id}-assistant-${index}`,
                        role: 'assistant',
                        content: assistantContent,
                        timestamp: new Date()
                    });
                }
            });
            
            // Get the title from the first user message
            const title = answers[0][0].length > 50 ? answers[0][0].substring(0, 50) + "..." : answers[0][0];
            
            return {
                id,
                title,
                messages,
                createdAt: new Date(),
                results: [],
                summary: answers[0][1] || ''
            };
        } catch (error) {
            console.error("Error getting chat:", error);
            return null;
        }
    }
    
    async getAllChats(): Promise<Chat[]> {
        try {
            // Get all chat metadata
            const items = await this.provider.getNextItems(100);
            const chats: Chat[] = [];
            
            // Convert each item to a Chat object
            for (const item of items) {
                const chat = await this.getChat(item.id);
                if (chat) {
                    chats.push(chat);
                }
            }
            
            return chats;
        } catch (error) {
            console.error("Error getting all chats:", error);
            return [];
        }
    }
    
    async deleteChat(id: string): Promise<void> {
        await this.provider.deleteItem(id);
    }
    
    async cleanupOldChats(daysToKeep: number = 30): Promise<void> {
        // This functionality is not directly supported by the IndexedDB provider
        // We would need to implement it manually by getting all chats and filtering by timestamp
        console.log("Cleanup old chats is not implemented in this version");
    }
}

export const chatStorageService = new ChatStorageService(); 