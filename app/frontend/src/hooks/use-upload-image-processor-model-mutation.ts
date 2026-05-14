import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type CreateImageProcessorInput,
  type UploadedImageProcessor,
  uploadImageProcessorModel,
} from '../services/api-service'
import { catalogKeys } from './use-catalog-table-query'

type UploadImageProcessorModelInput = {
  token: string
  file: File
  payload: CreateImageProcessorInput
}

export const useUploadImageProcessorModelMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<UploadedImageProcessor, Error, UploadImageProcessorModelInput>({
    mutationFn: ({ token, file, payload }) => uploadImageProcessorModel(token, file, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
