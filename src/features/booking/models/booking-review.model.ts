export interface BookingReview {
  movieTitle: string
  cinemaName: string
  roomName: string
  showtimeLabel: string
  totalMinor: number
  seats: {
    seatNumber: string
    typeLabel: string
    ticketGroupName: string
    capacity: number
    priceMinor: number
    unit: 'SEAT' | 'PAIR'
  }[]
}
