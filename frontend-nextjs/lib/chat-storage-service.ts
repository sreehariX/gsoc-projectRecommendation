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
            console.log(`Starting saveChat for chat ${chat.id} with ${chat.messages.length} messages`);
            console.log("Messages:", chat.messages.map(m => `${m.role}: ${m.content.substring(0, 30)}...`));
            
            // First get existing answers if any
            const existingAnswers = await this.provider.getItem(chat.id) || [];
            console.log(`Found ${existingAnswers.length} existing answers`);
            
            // Convert ALL messages to query-response pairs
            const newAnswers: Answers = [];
            const messages = [...chat.messages];
            
            // Group messages into pairs
            for (let i = 0; i < messages.length - 1; i += 2) {
                const userMessage = messages[i];
                const assistantMessage = messages[i + 1];
                
                if (userMessage?.role === 'user' && assistantMessage?.role === 'assistant') {
                    const pair: [string, any] = [userMessage.content, assistantMessage.content];
                    console.log(`Creating pair:
                        Query: "${pair[0].substring(0, 30)}..."
                        Response: "${pair[1]?.substring(0, 30)}..."
                    `);
                    newAnswers.push(pair);
                }
            }
            
            // Handle the last message if it's unpaired
            if (messages.length % 2 !== 0) {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage.role === 'user') {
                    newAnswers.push([lastMessage.content, null]);
                    console.log(`Added unpaired user message: "${lastMessage.content.substring(0, 30)}..."`);
                }
            }
            
            console.log(`Created ${newAnswers.length} new query-response pairs`);
            
            // For a new chat, just use the new answers
            if (existingAnswers.length === 0) {
                console.log('New chat - using new answers directly');
                await this.provider.addItem(chat.id, newAnswers);
            } else {
                // For existing chat, merge with existing answers
                const finalAnswers = [...existingAnswers];
                const existingQueriesMap = new Map(existingAnswers.map((pair, index) => [pair[0], index]));
                
                // Update or add new answers
                newAnswers.forEach(([query, response]) => {
                    const existingIndex = existingQueriesMap.get(query);
                    
                    if (existingIndex !== undefined) {
                        // Only update if we have a response
                        if (response !== null) {
                            console.log(`Updating existing query at index ${existingIndex} with response`);
                            finalAnswers[existingIndex] = [query, response];
                        }
                    } else {
                        // Add new answer
                        console.log(`Adding new query-response pair at index ${finalAnswers.length}`);
                        finalAnswers.push([query, response]);
                    }
                });
                
                await this.provider.addItem(chat.id, finalAnswers);
            }
            
            // Verify the save was successful
            const verifiedAnswers = await this.provider.getItem(chat.id);
            if (verifiedAnswers) {
                console.log(`Verification: Chat ${chat.id} saved with ${verifiedAnswers.length} message pairs`);
                verifiedAnswers.forEach((pair, idx) => {
                    console.log(`Verified pair ${idx}:
                        Query: "${pair[0].substring(0, 30)}..."
                        Response: ${pair[1] ? `"${pair[1].substring(0, 30)}..."` : 'null'}
                    `);
                });
            }
        } catch (error) {
            console.error("Error saving chat:", error);
        }
    }
    
    async getChat(id: string): Promise<Chat | null> {
        try {
            const answers = await this.provider.getItem(id);
            if (!answers || answers.length === 0) {
                console.log(`No answers found for chat ${id}`);
                return null;
            }
            
            console.log(`Retrieved ${answers.length} message pairs for chat ${id}`);
            
            // Debug: Log all retrieved answers
            answers.forEach((pair, idx) => {
                console.log(`Retrieved pair ${idx}: [${pair[0].substring(0, 30)}..., ${pair[1] ? pair[1].substring(0, 30) + '...' : 'null'}]`);
            });
            
            // Convert the answers back to a Chat object
            const messages: Message[] = [];
            
            // Process each query-response pair in order
            answers.forEach(([userContent, assistantContent], index) => {
                // Use fixed timestamp for message IDs to avoid regenerating them on each load
                const timeBase = 1000000000 + index * 1000;
                
                // Add user message
                const userMessage: Message = {
                    id: `${id}-user-${index}-${timeBase}`,
                    role: 'user',
                    content: userContent,
                    timestamp: new Date()
                };
                messages.push(userMessage);
                
                // Add assistant message if it exists
                if (assistantContent) {
                    const assistantMessage: Message = {
                        id: `${id}-assistant-${index}-${timeBase + 1}`,
                        role: 'assistant',
                        content: assistantContent,
                        timestamp: new Date()
                    };
                    messages.push(assistantMessage);
                }
            });
            
            console.log(`Reconstructed ${messages.length} messages for chat ${id}`);
            
            // Get the title from the first user message
            const title = answers[0][0].length > 50 ? answers[0][0].substring(0, 50) + "..." : answers[0][0];
            
            // Create the chat object
            const chat: Chat = {
                id,
                title,
                messages,
                createdAt: new Date(),
                results: [],
                summary: ''
            };
            
            // Get the summary from the last assistant message with a response
            for (let i = answers.length - 1; i >= 0; i--) {
                if (answers[i][1]) {
                    chat.summary = answers[i][1];
                    break;
                }
            }
            
            return chat;
        } catch (error) {
            console.error(`Error getting chat ${id}:`, error);
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