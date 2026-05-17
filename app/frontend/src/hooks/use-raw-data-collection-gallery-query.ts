import { useQuery } from '@tanstack/react-query'
import { loadRawDataCollectionGallery } from '../services/api-service'

export const rawDataCollectionGalleryKeys = {
  all: ['raw-data-collection-gallery'] as const,
  byParams: (
    token: string | null,
    rawDataCollectionSettingId: number | null,
    page: number,
    perPage: number,
    fromDateTime: string,
    toDateTime: string,
  ) =>
    [...rawDataCollectionGalleryKeys.all, token, rawDataCollectionSettingId, page, perPage, fromDateTime, toDateTime] as const,
}

export const useRawDataCollectionGalleryQuery = (
  token: string | null,
  rawDataCollectionSettingId: number | null,
  page: number,
  perPage: number,
  fromDateTime: string,
  toDateTime: string,
) =>
  useQuery({
    queryKey: rawDataCollectionGalleryKeys.byParams(
      token,
      rawDataCollectionSettingId,
      page,
      perPage,
      fromDateTime,
      toDateTime,
    ),
    queryFn: ({ queryKey }) => {
      const authToken = queryKey[1]
      const selectedRawDataCollectionSettingId = queryKey[2]
      const selectedPage = queryKey[3]
      const selectedPerPage = queryKey[4]
      const selectedFromDateTime = queryKey[5]
      const selectedToDateTime = queryKey[6]

      if (authToken === null || selectedRawDataCollectionSettingId === null) {
        throw new Error('Authentication token and raw data collection setting are required.')
      }

      return loadRawDataCollectionGallery(authToken, selectedRawDataCollectionSettingId, {
        page: selectedPage,
        perPage: selectedPerPage,
        fromDateTime: selectedFromDateTime,
        toDateTime: selectedToDateTime,
      })
    },
    enabled: token !== null && rawDataCollectionSettingId !== null,
  })
