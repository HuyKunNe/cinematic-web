import type { ShowSeatResponseStatus } from '@/services/api/generated/inventory-service/model/showSeatResponseStatus'

export interface BookingSeat {
  id: string
  seatNumber: string
  rowLabel: string
  typeLabel: string
  capacity: number
  priceMinor: number | null
  status: ShowSeatResponseStatus | 'UNKNOWN'
  selectable: boolean
}

export interface SelectedBookingSeat {
  id: string
  priceMinor: number
}
