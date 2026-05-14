import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCameraSource,
  type CreateCameraSourceInput,
} from '../services/api-service'
import { catalogKeys } from './use-catalog-table-query'

type CreateCameraSourceMutationInput = {
  token: string
  payload: CreateCameraSourceInput
}

export const useCreateCameraSourceMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<number, Error, CreateCameraSourceMutationInput>({
    mutationFn: ({ token, payload }) => createCameraSource(token, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
