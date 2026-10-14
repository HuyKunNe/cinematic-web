import type {
  ReplaceRoomLayoutContentRequest,
  RoomLayoutContentResponse,
  RoomLayoutGeometryInput,
  RoomLayoutGeometryResponse,
} from '@/services/api/generated/inventory-service/model'

function copyGeometry(geometry: RoomLayoutGeometryResponse): RoomLayoutGeometryInput {
  return {
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    rotationDegrees: geometry.rotationDegrees,
  }
}

export function toAdminRoomLayoutContentRequest(
  content: RoomLayoutContentResponse,
): ReplaceRoomLayoutContentRequest {
  return {
    expectedVersion: content.layout.version,
    seats: content.seats.map((seat) => ({
      seatId: seat.seatId,
      geometry: copyGeometry(seat.geometry),
    })),
    elements: content.elements.map((element) => ({
      kind: element.kind,
      label: element.label ?? undefined,
      geometry: copyGeometry(element.geometry),
    })),
  }
}
