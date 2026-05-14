import { useQuery } from '@tanstack/react-query'
import { loadDashboardData } from '../services/api-service'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (token: string | null) => [...dashboardKeys.all, token] as const,
}

export const useDashboardQuery = (token: string | null) =>
  useQuery({
    queryKey: dashboardKeys.detail(token),
    queryFn: ({ queryKey }) => {
      const authToken = queryKey[1]

      if (authToken === null) {
        throw new Error('Authentication token is required.')
      }

      return loadDashboardData(authToken)
    },
    enabled: token !== null,
  })
