import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type UpdateRawDataCollectionSettingInput,
  updateRawDataCollectionSetting,
} from '../services/api-service'
import { catalogKeys } from './use-catalog-table-query'

type UpdateRawDataCollectionSettingMutationInput = {
  token: string
  rawDataCollectionSettingId: number
  payload: UpdateRawDataCollectionSettingInput
}

export const useUpdateRawDataCollectionSettingMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<number, Error, UpdateRawDataCollectionSettingMutationInput>({
    mutationFn: ({ token, rawDataCollectionSettingId, payload }) =>
      updateRawDataCollectionSetting(token, rawDataCollectionSettingId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}
