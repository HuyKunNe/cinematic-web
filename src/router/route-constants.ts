export const ROUTE_NAMES = {
  HOME: 'home',
  MOVIES: 'movies',
  MOVIE_DETAIL: 'movie-detail',
  CINEMAS: 'cinemas',
  SHOWTIMES: 'showtimes',
  PROMOTIONS: 'promotions',
  BOOKING: 'booking',
  ACCOUNT: 'account',
  ACCOUNT_BOOKINGS: 'account-bookings',

  AUTH_CALLBACK: 'auth-callback',
  AUTH_REQUIRED: 'auth-required',
  AUTH_FORBIDDEN: 'auth-forbidden',

  ADMIN: 'admin',
  ADMIN_MOVIES: 'admin-movies',
  ADMIN_CINEMAS: 'admin-cinemas',
  ADMIN_ROOMS: 'admin-rooms',
  ADMIN_SHOWTIMES: 'admin-showtimes',
  ADMIN_BOOKINGS: 'admin-bookings',
  ADMIN_USERS: 'admin-users',

  NOT_FOUND: 'not-found',
} as const

export const ROUTE_PATHS = {
  HOME: '/',
  MOVIES: '/movies',
  MOVIE_DETAIL: '/movies/:movieId',
  CINEMAS: '/cinemas',
  SHOWTIMES: '/showtimes',
  PROMOTIONS: '/promotions',
  BOOKING: '/booking/:showtimeId',
  ACCOUNT: '/account',
  ACCOUNT_BOOKINGS: '/account/bookings',

  AUTH_CALLBACK: '/auth/callback',
  AUTH_REQUIRED: '/auth/required',
  AUTH_FORBIDDEN: '/auth/forbidden',

  ADMIN: '/admin',
  ADMIN_MOVIES: '/admin/movies',
  ADMIN_CINEMAS: '/admin/cinemas',
  ADMIN_ROOMS: '/admin/rooms',
  ADMIN_SHOWTIMES: '/admin/showtimes',
  ADMIN_BOOKINGS: '/admin/bookings',
  ADMIN_USERS: '/admin/users',

  NOT_FOUND: '/:pathMatch(.*)*',
} as const
