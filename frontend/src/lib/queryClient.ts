import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,      // 5 minutes - data considered fresh
            gcTime: 30 * 60 * 1000,        // 30 minutes - keep in cache  
            refetchOnWindowFocus: false,   // Don't refetch on tab focus
            retry: 1,
        },
    },
});

// Persist to localStorage for instant loads after browser restart
const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'pixelscale-query-cache',
});

persistQueryClient({
    queryClient,
    persister,
    maxAge: 30 * 60 * 1000, // 30 minutes max cache age
});
