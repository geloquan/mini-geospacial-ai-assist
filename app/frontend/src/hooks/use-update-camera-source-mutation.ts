import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type UpdateCameraSourceInput,
  updateCameraSource,
} from '../services/api-service'
import { catalogKeys } from './use-catalog-table-query'

type UpdateCameraSourceMutationInput = {
  token: string
  cameraSourceId: number
  payload: UpdateCameraSourceInput
}

export const useUpdateCameraSourceMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<number, Error, UpdateCameraSourceMutationInput>({
    mutationFn: ({ token, cameraSourceId, payload }) =>
      updateCameraSource(token, cameraSourceId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
