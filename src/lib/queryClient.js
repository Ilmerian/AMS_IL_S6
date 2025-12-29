// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query'

/**
 * Client de cache et de requêtes React Query
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      cacheTime: 300000,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      retry: 1,
      refetchOnReconnect: true,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  }
})