import { useCallback, useContext } from "react"
import { AppContext } from "../utils/context"
import { fakeFetch, RegisteredEndpoints } from "../utils/fetch"
import { useWrappedRequest } from "./useWrappedRequest"

export function useCustomFetch() {
  const { cache } = useContext(AppContext)
  const { loading, wrappedRequest } = useWrappedRequest()

  const fetchWithCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        
        if (params && (params as any).value !== null) {
          cache?.current.forEach((cacheValue, cacheKey) => {
              let foundEmployeeId = "";
              
              if (cacheKey.startsWith("paginatedTransactions")) {
                  const parsedCacheValue = JSON.parse(cacheValue);
      
                  parsedCacheValue.data.forEach((transaction: any) => {
                      if (transaction.id === (params as any).transactionId) {
                          transaction.approved = (params as any).value;
                          foundEmployeeId = transaction.employee.id;
                      }
                  });
      
                  cache.current.set(cacheKey, JSON.stringify(parsedCacheValue));
      
                  if (foundEmployeeId) {
                      const employeeCacheKey = `transactionsByEmployee@{"employeeId":"${foundEmployeeId}"}`;
                      const employeeTransactions = cache.current.get(employeeCacheKey);
      
                      if (employeeTransactions) {
                          const parsedEmployeeTransactions = JSON.parse(employeeTransactions);
      
                          parsedEmployeeTransactions.forEach((employeeTransaction: any) => {
                              if (employeeTransaction.id === (params as any).transactionId) {
                                  employeeTransaction.approved = (params as any).value;
                              }
                          });
      
                          cache.current.set(employeeCacheKey, JSON.stringify(parsedEmployeeTransactions));
                      }
                  }
              }
          });
      }
      
      const generatedCacheKey = getCacheKey(endpoint, params);
      const existingCacheResponse = cache?.current.get(generatedCacheKey);
      
      if (existingCacheResponse) {
          const parsedData = JSON.parse(existingCacheResponse);
          return parsedData as Promise<TData>;
      }
      
      const fetchResult = await fakeFetch<TData>(endpoint, params);
      cache?.current.set(generatedCacheKey, JSON.stringify(fetchResult));
      return fetchResult;
      
      }),
    [cache, wrappedRequest]
  )

  const fetchWithoutCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const result = await fakeFetch<TData>(endpoint, params)
        return result
      }),
    [wrappedRequest]
  )

  const clearCache = useCallback(() => {
    if (cache?.current === undefined) {
      return
    }

    cache.current = new Map<string, string>()
  }, [cache])

  const clearCacheByEndpoint = useCallback(
    (endpointsToClear: RegisteredEndpoints[]) => {
      if (cache?.current === undefined) {
        return
      }

      const cacheKeys = Array.from(cache.current.keys())

      for (const key of cacheKeys) {
        const clearKey = endpointsToClear.some((endpoint) => key.startsWith(endpoint))

        if (clearKey) {
          cache.current.delete(key)
        }
      }
    },
    [cache]
  )

  return { fetchWithCache, fetchWithoutCache, clearCache, clearCacheByEndpoint, loading }
}

function getCacheKey(endpoint: RegisteredEndpoints, params?: object) {
  return `${endpoint}${params ? `@${JSON.stringify(params)}` : ""}`
}
