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
            console.log(`Adding/updating item with ID: ${id}`);
            console.log(`Answers:`, JSON.stringify(answers));
            
            const timestamp = new Date().getTime();
            const db = await this.init();
            const tx = db.transaction(this.storeName, "readwrite");
            const current = await tx.objectStore(this.storeName).get(id);
            
            if (current) {
                console.log(`Updating existing item: ${id}`);
                await tx.objectStore(this.storeName).put({ ...current, id, timestamp, answers });
            } else {
                console.log(`Adding new item: ${id}`);
                // Extract title from the first user message
                const title = answers[0][0].length > 50 ? answers[0][0].substring(0, 50) + "..." : answers[0][0];
                await tx.objectStore(this.storeName).add({ id, title, timestamp, answers });
            }
            
            await tx.done;
            console.log(`Successfully saved item: ${id}`);
        } catch (error) {
            console.error(`Error adding item ${id}:`, error);
        }
    }

    async getItem(id: string): Promise<Answers | null> {
        try {
            console.log(`Getting item with ID: ${id}`);
            const db = await this.init();
            const tx = db.transaction(this.storeName, "readonly");
            const item = await tx.objectStore(this.storeName).get(id);
            
            if (item) {
                console.log(`Found item: ${id}`);
                return item.answers;
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