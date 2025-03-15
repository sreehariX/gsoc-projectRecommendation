import { useMemo } from "react";
import { IHistoryProvider, HistoryProviderOptions } from "./IProvider";
import { NoneProvider } from "./None";
import { IndexedDBProvider } from "./IndexedDB";

// Use consistent database name and store name
const DB_NAME = "chat_history_db";
const STORE_NAME = "chats";

export const useHistoryManager = (provider: HistoryProviderOptions): IHistoryProvider => {
    const providerInstance = useMemo(() => {
        switch (provider) {
            case HistoryProviderOptions.IndexedDB:
                return new IndexedDBProvider(DB_NAME, STORE_NAME);
            case HistoryProviderOptions.None:
            default:
                return new NoneProvider();
        }
    }, [provider]);

    return providerInstance;
}; 