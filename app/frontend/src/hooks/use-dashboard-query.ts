import { useQuery } from '@tanstack/react-query'
import { loadDashboardData } from '../services/api-service'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (token: string | null) => [...dashboardKeys.all, token] as const,
}

export const useDashboardQuery = (token: string | null) =>
  useQuery({
    queryKey: dashboardKeys.detail(token),
    queryFn: async () => {
      if (token === null) {
        throw new Error('Please login first.')
      }

      return loadDashboardData(token)
    },
    enabled: token !== null,
  })
