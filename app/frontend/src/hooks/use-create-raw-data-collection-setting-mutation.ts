import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createRawDataCollectionSetting,
  type CreateRawDataCollectionSettingInput,
} from '../services/api-service'
import { catalogKeys } from './use-catalog-table-query'

type CreateRawDataCollectionSettingMutationInput = {
  token: string
  payload: CreateRawDataCollectionSettingInput
}

export const useCreateRawDataCollectionSettingMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<number, Error, CreateRawDataCollectionSettingMutationInput>({
    mutationFn: ({ token, payload }) => createRawDataCollectionSetting(token, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
