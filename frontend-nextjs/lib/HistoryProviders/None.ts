import { IHistoryProvider, Answers, HistoryProviderOptions, HistoryMetaData } from "./IProvider";

export class NoneProvider implements IHistoryProvider {
    getProviderName = () => HistoryProviderOptions.None;

    resetContinuationToken(): void {
        // No-op for None provider
    }

    async getNextItems(count: number): Promise<HistoryMetaData[]> {
        return [];
    }

    async addItem(id: string, answers: Answers): Promise<void> {
        // No-op for None provider
        return;
    }

    async getItem(id: string): Promise<Answers | null> {
        return null;
    }

    async deleteItem(id: string): Promise<void> {
        // No-op for None provider
        return;
    }

    async initializeDB(): Promise<void> {
        // No-op for None provider
        return;
    }
} 