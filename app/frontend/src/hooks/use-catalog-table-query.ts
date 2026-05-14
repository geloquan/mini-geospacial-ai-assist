import { useQuery } from '@tanstack/react-query'
import {
  loadCatalogTable,
  type CatalogResourceEndpoint,
} from '../services/api-service'

export const catalogKeys = {
  all: ['catalog'] as const,
  table: (
    token: string | null,
    endpoint: CatalogResourceEndpoint,
    page: number,
    perPage: number,
  ) => [...catalogKeys.all, token, endpoint, page, perPage] as const,
}

export const useCatalogTableQuery = (
  token: string | null,
  endpoint: CatalogResourceEndpoint,
  page: number,
  perPage: number,
) =>
  useQuery({
    queryKey: catalogKeys.table(token, endpoint, page, perPage),
    queryFn: ({ queryKey }) => {
      const authToken = queryKey[1]
      const selectedEndpoint = queryKey[2]
      const selectedPage = queryKey[3]
      const selectedPerPage = queryKey[4]

      if (authToken === null) {
        throw new Error('Authentication token is required.')
      }

      return loadCatalogTable(authToken, selectedEndpoint, selectedPage, selectedPerPage)
    },
    enabled: token !== null,
  })
