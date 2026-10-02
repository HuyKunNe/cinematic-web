export interface CinemaLocation {
  id: string
  name: string
  address: string
  city: string
  cityKey: string
}

export interface CinemaCity {
  key: string
  name: string
}

export interface CinemaLocationCatalog {
  cinemas: CinemaLocation[]
  cities: CinemaCity[]
}
