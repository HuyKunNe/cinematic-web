import type { ShowSeatResponseStatus } from '@/services/api/generated/inventory-service/model/showSeatResponseStatus'

export interface BookingSeat {
  id: string
  seatNumber: string
  rowLabel: string
  seatType: 'STANDARD' | 'VIP' | 'COUPLE' | 'ACCESSIBLE'
  position: { row: number; column: number; span: number } | null
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

export interface BookingSeatMap {
  seats: BookingSeat[]
  matrix: { rowCount: number; columnCount: number } | null
}
