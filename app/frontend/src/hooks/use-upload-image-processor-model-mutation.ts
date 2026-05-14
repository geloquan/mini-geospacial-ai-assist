import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type UploadedImageProcessor,
  uploadImageProcessorModel,
} from '../services/api-service'
import { catalogKeys } from './use-catalog-table-query'

type UploadImageProcessorModelInput = {
  token: string
  file: File
}

export const useUploadImageProcessorModelMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<UploadedImageProcessor, Error, UploadImageProcessorModelInput>({
    mutationFn: ({ token, file }) => uploadImageProcessorModel(token, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
