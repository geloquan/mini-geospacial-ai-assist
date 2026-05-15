import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateLocation } from '../services/api-service'
import type { UpdateLocationInput } from '../types/geospatial'
import { catalogKeys } from './use-catalog-table-query'
import { dashboardKeys } from './use-dashboard-query'

type UpdateLocationMutationInput = {
  token: string
  locationId: number
  payload: UpdateLocationInput
}

export const useUpdateLocationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ token, locationId, payload }: UpdateLocationMutationInput) =>
      updateLocation(token, locationId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
