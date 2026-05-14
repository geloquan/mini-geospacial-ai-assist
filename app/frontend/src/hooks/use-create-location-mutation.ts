import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLocation } from '../services/api-service'
import type { CreateCameraLocationInput } from '../types/geospatial'
import { dashboardKeys } from './use-dashboard-query'

type CreateLocationInput = {
  token: string
  payload: CreateCameraLocationInput
}

export const useCreateLocationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ token, payload }: CreateLocationInput) => createLocation(token, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}
