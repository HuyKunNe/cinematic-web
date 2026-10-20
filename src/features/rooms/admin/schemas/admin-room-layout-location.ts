import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'

export function readRoomLayoutLocation(value: unknown): {
  id: string
  invalid: boolean
} {
  if (value === undefined) {
    return { id: '', invalid: false }
  }

  if (!isRoomSeatUuid(value)) {
    return { id: '', invalid: true }
  }

  return {
    id: value.toLowerCase(),
    invalid: false,
  }
}
