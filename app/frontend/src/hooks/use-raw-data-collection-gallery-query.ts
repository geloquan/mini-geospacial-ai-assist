import { useQuery } from '@tanstack/react-query'
import { loadRawDataCollectionGallery } from '../services/api-service'

export const rawDataCollectionGalleryKeys = {
  all: ['raw-data-collection-gallery'] as const,
  byId: (token: string | null, rawDataCollectionSettingId: number | null) =>
    [...rawDataCollectionGalleryKeys.all, token, rawDataCollectionSettingId] as const,
}

export const useRawDataCollectionGalleryQuery = (
  token: string | null,
  rawDataCollectionSettingId: number | null,
) =>
  useQuery({
    queryKey: rawDataCollectionGalleryKeys.byId(token, rawDataCollectionSettingId),
    queryFn: ({ queryKey }) => {
      const authToken = queryKey[1]
      const selectedRawDataCollectionSettingId = queryKey[2]

      if (authToken === null || selectedRawDataCollectionSettingId === null) {
        throw new Error('Authentication token and raw data collection setting are required.')
      }

      return loadRawDataCollectionGallery(authToken, selectedRawDataCollectionSettingId)
    },
    enabled: token !== null && rawDataCollectionSettingId !== null,
  })
