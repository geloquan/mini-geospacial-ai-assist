export type ModuleItem = {
  slug: string
  title: string
  description: string
}

export type Location = {
  id: number
  locationName: string
  descriptiveLocation: string
  imagePaths: string[]
  timezone: string
  latitude: number | null
  longitude: number | null
}

export type CreateLocationInput = {
  locationName: string
  descriptiveLocation: string | null
  imagePaths: string[]
  timezone: string
  latitude: number | null
  longitude: number | null
}

export type UpdateLocationInput = Partial<CreateLocationInput>
