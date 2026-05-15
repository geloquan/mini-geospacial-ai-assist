import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type UpdateImageProcessorInput,
  type UploadedImageProcessor,
  updateImageProcessor,
} from '../services/api-service'
import { catalogKeys } from './use-catalog-table-query'

type UpdateImageProcessorMutationInput = {
  token: string
  imageProcessorId: number
  file: File | null
  payload: UpdateImageProcessorInput
}

export const useUpdateImageProcessorMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<UploadedImageProcessor, Error, UpdateImageProcessorMutationInput>({
    mutationFn: ({ token, imageProcessorId, file, payload }) =>
      updateImageProcessor(token, imageProcessorId, payload, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
