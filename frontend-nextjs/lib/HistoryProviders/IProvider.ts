import { Chat } from "../chat-store";

export type HistoryMetaData = { id: string; title: string; timestamp: number };
export type Answers = [string, any][];

export const enum HistoryProviderOptions {
    None = "none",
    IndexedDB = "indexedDB"
}

export interface IHistoryProvider {
    getProviderName(): HistoryProviderOptions;
    resetContinuationToken(): void;
    getNextItems(count: number): Promise<HistoryMetaData[]>;
    addItem(id: string, answers: Answers): Promise<void>;
    getItem(id: string): Promise<Answers | null>;
    deleteItem(id: string): Promise<void>;
    initializeDB(): Promise<void>;
} 