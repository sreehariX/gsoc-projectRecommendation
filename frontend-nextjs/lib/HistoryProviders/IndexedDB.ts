import { IDBPDatabase, openDB } from "idb";
import { IHistoryProvider, Answers, HistoryProviderOptions, HistoryMetaData } from "./IProvider";

export class IndexedDBProvider implements IHistoryProvider {
    getProviderName = () => HistoryProviderOptions.IndexedDB;

    private dbName: string;
    private storeName: string;
    private dbPromise: Promise<IDBPDatabase> | null = null;
    private cursorKey: IDBValidKey | undefined;
    private isCursorEnd: boolean = false;

    constructor(dbName: string, storeName: string) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.cursorKey = undefined;
        this.isCursorEnd = false;
        console.log(`IndexedDB provider initialized with database: ${dbName}, store: ${storeName}`);
    }

    async initializeDB(): Promise<void> {
        console.log(`Initializing IndexedDB: ${this.dbName}`);
        await this.init();
        console.log(`IndexedDB initialized successfully: ${this.dbName}`);
    }

    private async init() {
        const storeName = this.storeName;
        if (!this.dbPromise) {
            console.log(`Creating new database connection: ${this.dbName}`);
            this.dbPromise = openDB(this.dbName, 1, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        console.log(`Creating object store: ${storeName}`);
                        const store = db.createObjectStore(storeName, { keyPath: "id" });
                        store.createIndex("timestamp", "timestamp");
                        console.log(`Object store created: ${storeName}`);
                    } else {
                        console.log(`Object store already exists: ${storeName}`);
                    }
                }
            });
        }
        return this.dbPromise;
    }

    resetContinuationToken() {
        this.cursorKey = undefined;
        this.isCursorEnd = false;
    }

    async getNextItems(count: number): Promise<HistoryMetaData[]> {
        const db = await this.init();
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const index = store.index("timestamp");

        // return empty array if cursor is already at the end
        if (this.isCursorEnd) {
            return [];
        }

        // set cursor to the last key
        let cursor = this.cursorKey ? await index.openCursor(IDBKeyRange.upperBound(this.cursorKey), "prev") : await index.openCursor(null, "prev");

        // return empty array means no more history or no data. set isCursorEnd to true and return empty array
        if (!cursor) {
            this.isCursorEnd = true;
            return [];
        }

        const loadedItems: { id: string; title: string; timestamp: number; answers: Answers }[] = [];
        for (let i = 0; i < count && cursor; i++) {
            loadedItems.push(cursor.value);
            cursor = await cursor.continue();
        }

        // set isCursorEnd to true if cursor is null
        if (!cursor) {
            this.isCursorEnd = true;
        }

        // update cursorKey
        this.cursorKey = cursor?.key;

        return loadedItems;
    }

    async addItem(id: string, answers: Answers): Promise<void> {
        try {
            console.log(`Adding/updating item with ID: ${id}, with ${answers.length} answers`);
            
            const timestamp = new Date().getTime();
            const db = await this.init();
            
            // First, get the existing item if it exists
            const tx1 = db.transaction(this.storeName, "readonly");
            const current = await tx1.objectStore(this.storeName).get(id);
            await tx1.done;
            
            // Start a new transaction for writing
            const tx2 = db.transaction(this.storeName, "readwrite");
            
            if (current) {
                console.log(`Item exists. Current has ${current.answers ? current.answers.length : 0} answers`);
                
                // Create a map of existing queries for quick lookup
                const existingQueries = new Map<string, number>();
                if (current.answers && current.answers.length > 0) {
                    current.answers.forEach((pair: [string, any], index: number) => {
                        existingQueries.set(pair[0], index);
                    });
                }
                
                // Create a copy of the current answers array
                let updatedAnswers = current.answers ? [...current.answers] : [];
                
                // Process new answers in order (not reverse) to maintain correct indexing
                for (let i = 0; i < answers.length; i++) {
                    const [query, response] = answers[i];
                    const existingIndex = existingQueries.get(query);
                    
                    if (existingIndex !== undefined) {
                        // Always update the response if it exists
                        console.log(`Updating existing query at index ${existingIndex}: "${query.substring(0, 30)}..."`);
                        updatedAnswers[existingIndex] = [query, response];
                    } else {
                        // Add new answer at the end
                        console.log(`Adding new query: "${query.substring(0, 30)}..."`);
                        updatedAnswers.push([query, response]);
                        existingQueries.set(query, updatedAnswers.length - 1);
                    }
                }
                
                // Update the item with the modified answers array
                await tx2.objectStore(this.storeName).put({
                    ...current,
                    timestamp,
                    answers: updatedAnswers
                });
                
                console.log(`Updated item. Now has ${updatedAnswers.length} answers`);
            } else {
                // For new items, process answers in order
                const processedAnswers: Answers = [];
                const seenQueries = new Set<string>();
                
                // Process in order to maintain correct indexing
                for (let i = 0; i < answers.length; i++) {
                    const [query, response] = answers[i];
                    if (!seenQueries.has(query)) {
                        processedAnswers.push([query, response]);
                        seenQueries.add(query);
                    }
                }
                
                console.log(`Creating new item with ${processedAnswers.length} answers`);
                const title = processedAnswers[0][0].length > 50 ? processedAnswers[0][0].substring(0, 50) + "..." : processedAnswers[0][0];
                await tx2.objectStore(this.storeName).add({ id, title, timestamp, answers: processedAnswers });
            }
            
            await tx2.done;
            
            // Verify the save worked
            const tx3 = db.transaction(this.storeName, "readonly");
            const saved = await tx3.objectStore(this.storeName).get(id);
            console.log(`Verification: Item ${id} now has ${saved.answers.length} answers`);
            
            // Log all answers for debugging
            saved.answers.forEach((answer: [string, any], idx: number) => {
                console.log(`Answer ${idx}: "${answer[0].substring(0, 30)}..." with ${answer[1] ? 'response' : 'no response'}`);
            });
        } catch (error) {
            console.error(`Error in addItem(${id}):`, error);
        }
    }

    async getItem(id: string): Promise<Answers | null> {
        try {
            console.log(`Getting item with ID: ${id}`);
            const db = await this.init();
            const tx = db.transaction(this.storeName, "readonly");
            const item = await tx.objectStore(this.storeName).get(id);
            
            if (item) {
                console.log(`Found item: ${id} with ${item.answers.length} answers`);
                
                // Ensure we return a deep copy of the answers array to prevent accidental modifications
                const answersCopy = JSON.parse(JSON.stringify(item.answers));
                console.log(`Retrieved ${answersCopy.length} answers for item ${id}`);
                
                // Debug log each retrieved answer
                answersCopy.forEach((pair: [string, any], idx: number) => {
                    console.log(`Retrieved answer ${idx}: "${pair[0].substring(0, 30)}..." with ${pair[1] ? 'response' : 'no response'}`);
                });
                
                return answersCopy;
            } else {
                console.log(`Item not found: ${id}`);
                return null;
            }
        } catch (error) {
            console.error(`Error getting item ${id}:`, error);
            return null;
        }
    }

    async deleteItem(id: string): Promise<void> {
        try {
            console.log(`Deleting item with ID: ${id}`);
            const db = await this.init();
            await db.delete(this.storeName, id);
            console.log(`Successfully deleted item: ${id}`);
        } catch (error) {
            console.error(`Error deleting item ${id}:`, error);
        }
    }
} 