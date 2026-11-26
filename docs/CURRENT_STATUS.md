# Current Status

## USER saved-ticket metadata degradation — 2026-11-26

Compared generated/BE BookingResponse and movie lookup contract: saved bookings
still lack historical movie/cinema/room/start metadata snapshots. The shared
booking context previously discarded valid showtime/location details whenever
movie lookup failed. It now handles only movie HTTP 404 as missing metadata
(movie=null), preserving validated showtime/room/cinema fields; all other errors,
access failures and identity checks retain normal failure behavior.

Updated User booking consumers for nullable movie metadata, real placeholder
assets and an unavailable-movie explanation on confirmed tickets. New selection
and draft checkout remain blocked without movie metadata, as they were on lookup
failure; saved seats/prices and pickup QR stay sourced from their respective APIs.
Poster failure flags now reset when the API poster URL changes. No new API/DTO,
mock, status inference, dependency, CSS or responsive layout change.

FE_BOOKING_REVIEW.md records the remaining BE snapshot requirement. Source/diff
review only; manual movie-404 versus 403/500, missing inventory metadata, booking
guards and desktop/mobile review pending. No tests, lint, typecheck, build,
browser/API requests, BE/generated/reference edits, database access or commits/pushes.

## USER seat-rule source review — 2026-11-26

Compared current orphan/adjacency validation with the agreed single-unit
exception, multi-row selections, indivisible couple units and physical aisle
boundaries. No justified algorithm change was found in this source pass.
Added precise manual scenarios to FE_BOOKING_REVIEW.md, including four-seat
segments, G6/F8, unavailable/unpriced snapshots and missing positions.

Documentation only; no application/API/CSS change. This is not a test pass or
runtime certification. No tests, lint, typecheck, build, browser/API requests,
BE/generated/reference edits, database access, commits or pushes.

## USER restored seat-selection feedback and owner scope — 2026-11-26

Seat selection now explains partial restoration when saved seats are absent,
unavailable or unpriced in the current snapshot, rather than silently dropping
them. Existing restoration/filtering rules are unchanged. The current selection,
its bill and interaction readiness are explicitly scoped to the authenticated
owner captured at mount, matching the selection storage/checkout owner checks.
Switching or losing that session hides old selected seats/totals and blocks clicks
without clearing another owner's stored request or selection.

No new API, price/availability calculation, dependency or responsive CSS changes.
Updated FE_BOOKING_REVIEW.md. Source/diff review only; manual partial-restore,
session-switch, polling price/status change and network recovery checks pending.
No tests, lint, typecheck, build, browser/API requests, BE/database writes,
commits or pushes.

## USER seat-map background error continuity — 2026-11-26

BookingSeatSelection retains its validated cached seat map read-only during
transient background errors, alongside a stale-data warning, instead of hiding
the map while retaining its selected-seat bill. Existing readiness guards keep
selection/checkout disabled until a successful refresh. Permission/not-found/
layout conflicts (401/403/404/409 or layout-required code) still hide the map.
No local selection, availability, price or server-state mutation is introduced.

Removed routine Refresh: the existing seat query already polls every 15 seconds.
Retry appears only on error and shares any in-flight GET. No new API or CSS;
existing responsive matrix/bill layout is retained. Updated FE_BOOKING_REVIEW.md.
Source/diff review only; manual cached-map error/recovery, access/layout failures
and selected-seat price/status changes pending. No tests, lint, typecheck, build,
browser/API requests, BE/database writes, commits or pushes.

## USER checkout rejection revalidation — 2026-11-26

Connected BookingCheckout's existing rejected event to BookingDraftCheckout. The
parent now clears its checked quote, waits for the child request lock to release
and refreshes context/seats, then requotes only if the selection remains valid.
The API rejection remains visible; invalid/occupied seats retain the existing
return-to-selection guidance. Context/seat refresh shares existing in-flight GETs.
No automatic resubmission or new request ID is introduced by this handler.

The existing definite-rejection classification is unchanged. Unknown network/5xx
outcomes do not enter this path and retain the same stored idempotent request.
No API, dependency or responsive CSS changes. Updated FE_BOOKING_REVIEW.md.
Source/diff review only; manual rejection/changed-seat/price/network retry checks
pending. No tests, lint, typecheck, build, browser/API requests, BE/database writes,
commits or pushes.

## USER restored checkout ownership — 2026-11-26

BookingCheckout now gates its stored checkpoint, continue/retry entry point,
submit-button availability and resolved-order link on the authenticated owner
captured when that checkout mounted. This matches the existing owner-scoped seat
selection and submit API guards, avoiding old-owner request display/actions if a
session changes before the component unmounts. No storage deletion, request/provider
rewrite, new idempotency key, API or responsive CSS changes.

Updated FE_BOOKING_REVIEW.md. Source/diff review only; manual pending-request
restore, same-owner retry and changed/expired-session checks pending. No tests,
lint, typecheck, build, browser/API requests, BE/database writes, commits or pushes.

## USER processing error presentation — 2026-11-26

If a loaded processing order fails to refresh or automatic result navigation
fails, BookingOrderPage now hides the waiting hero/spinner and supplies the page
heading alongside its existing error/recovery UI. Previously error and indefinite
processing messages appeared together. The payment observer remains mounted via
v-show, preserving status polling and recovery rather than resetting the flow.
Successful recovery restores the normal view through existing reactive state.

No new controls, endpoint, payment/booking mutation, CSS or responsive changes.
Updated FE_BOOKING_REVIEW.md. Source/diff review only; manual loaded-processing
network-error/recovery and navigation-failure checks pending. No tests, lint,
typecheck, build, browser/API requests, BE/database writes or commits/pushes.

## USER checkout reload and project review — 2026-11-26

Reloaded repository instructions/docs and compared current routes, booking/payment/
pickup code and payment controller contract. Working tree was clean on entry.
See FE_BOOKING_REVIEW.md for source-backed route mapping, documentation conflicts
and pending manual verification; this does not certify unrelated Admin/Staff work.

Payment manual refresh now shares in-flight GETs, prevents duplicate clicks and
only emits booking refresh while mounted for the original owner/booking. Manual
spinner state is separate from polling, with provider handoff blocked during that
check. No endpoint, business-state, dependency or responsive CSS change.

Source/diff review only. No tests, lint, typecheck, build, format, browser/API
runtime checks, BE/generated/reference edits, database access, commits or pushes.

## USER pickup QR identity and deadline feedback — 2026-11-20

The confirmed-ticket view now explicitly scopes pickup data/QR to the active
authenticated owner and current booking ID, including deadline observation.
If a READY response still has a reached expiry, the QR remains hidden; the copy
distinguishes an actual in-flight status check from a completed check, with an
exception-only Check Pickup Code action after the latter. Normal READY states
still have no routine refresh button. BE status/expiry are not changed locally.

No API, dependency, CSS or responsive layout changes. Source/diff review only;
manual account/booking changes and reached-deadline checks remain pending. No
tests, lint, typecheck, build, browser/API requests, BE/database writes, commits
or pushes were run.

## USER one real pickup QR per booking — 2026-11-20

After the user's approval to continue with qrcode, installed qrcode 1.5.4 and
@types/qrcode 1.5.6 with lifecycle scripts/audit/funding requests disabled. The
initial install failed TLS validation; retry using the system CA store succeeded
without disabling certificate checks. package.json/package-lock.json updated.

The owner pickup query now validates BE payload/expiry and renders the QR locally
with qrcode's browser renderer. Raw payload is discarded from the returned model;
the resulting credential-bearing data URL stays only in the owner-scoped in-memory
query, gcTime 0, without local/session storage, logging or external QR services.
The shared result/ticket card shows one QR only after a fresh successful READY
response while its BE expiry is in the future. Errors/non-ready states hide it.
At the supplied expiry the image is hidden and the existing GET refreshes once;
FE does not change BE status or extend expiry. Existing waiting/error/used states
and error-only retry remain. User still has no print action.

QR styling reuses the reference's 140px size through a named journey token and
fits the existing desktop/mobile code panel, with standard white quiet zone.
Compared installed library source/types and reviewed source/diff only. No tests,
lint, typecheck, build, runtime/browser/API requests, BE/database writes, commits
or pushes were run. Manual validation pending: READY scan against Staff/POS,
expiry while open, WAITING-to-READY, error recovery and account changes. Actual
physical printing remains outside the User FE and is not supplied by this API.


## USER booking pickup metadata integration — 2026-11-20

Current checkout now contains generated getBookingPickupPass and BE owner/lookup
contracts. Compared the controller, response enums and transaction service.
Added customer-pickup query and switched confirmed result/ticket metadata to the
owner pickup-pass GET, removing the extra per-ticket list request from this view.
It displays BE WAITING_FOR_TICKETS, READY, EXPIRED, TICKETS_USED, NOT_CONFIRMED and
UNAVAILABLE without inferring check-in/expiry locally. Only issuance waiting polls.
Owner-scoped keys, identity/display-code validation, no retries, zero cache lifetime
and generic validation errors apply. QR credentials are stripped from query data.

This is metadata integration only: actual QR rendering is pending explicit user
approval to add qrcode (AGENTS dependency rule). No QR renderer/dependency has been
added; the one-QR requirement is not complete. No User print/check-in/Staff/POS
action was added. Existing styles and error-only retry are retained.

Source/diff review only; API/runtime states remain manually unverified. No tests,
lint, typecheck, build, browser/API requests, BE/database writes, commits or pushes.


## USER booking-card reference identification — 2026-11-20

Restored the local reference's small order identifier above each movie title,
using only the last six uppercase characters of the booking ID. Existing ID
styles are reused, without another status badge or new action. Ticket/detail
links now include the short reference and available movie title in their
accessible names to distinguish repeated actions in assistive navigation.
Full IDs remain in API/navigation. No API or responsive CSS changes.

Source/diff review only; browser verification remains unavailable after the
reported connection timeouts. Manual checks pending for repeated same-movie
orders and narrow widths. No tests, lint, typecheck, build, BE/database writes,
commits or pushes were run.

## USER remove remaining duplicate list actions — 2026-11-20

With active-order polling now present, account-booking lists no longer show a
routine Refresh button. Retry remains available after initial/background errors.
Empty states omit View All Orders and Showtimes actions that duplicate the tabs
and page-header New Booking link. Return to First Page remains for empty later
pages, and multi-page pagination is retained. No new controls, API, filters,
business-state or responsive CSS changes. Existing query focus refresh remains.

Source/diff review only; manual empty-list, tab navigation and error recovery
checks pending. No tests, lint, typecheck, build, browser checks, BE/database
writes, commits or pushes were run.

## USER quieter list refresh controls — 2026-11-20

Account-list Refresh/Retry buttons now show a spinner only for a manual refresh,
not each automatic polling request. Manual refresh shares an existing in-flight
request rather than cancelling/restarting it and prevents repeated manual clicks.
Pagination is hidden for zero/one-page results; the existing Return to First Page
recovery remains available for empty later pages. Multi-page navigation remains.

No API/filter, polling frequency, responsive CSS or role changes. Source/diff
review only; manual polling/refresh and single/multi-page checks pending. No
tests, lint, typecheck, build, browser checks, BE/database writes, commits or pushes.

## USER booking-list background error recovery — 2026-11-20

Transient background refresh failures retain the already-loaded booking cards
with a clear stale-data warning. The existing Refresh action becomes Retry; no
extra button is added. Initial-load failures and 401/403/404 still replace the
list with the error/retry panel, so cached content is not rendered after lost
access. Successful refresh clears the warning through existing query state.

No API, business-state, polling or responsive CSS changes. Source/diff review
only; manual network-error/recovery and access-loss checks pending. No tests,
lint, typecheck, build, browser checks, BE/database writes, commits or pushes.

## USER active booking-list updates — 2026-11-20

The account booking list now reuses its existing filtered GET every three seconds
while the visible page contains PENDING or RESERVED bookings. It stops polling
when those orders leave active states or the request fails; background interval
polling is disabled. This brings pending/payment progress into the list without
requiring the customer to open each order or repeatedly press Refresh. Existing
showtime-end boundary refresh, manual error recovery, server pagination and
filters remain unchanged. No local status/total mutation or new endpoint.

Source/diff review only; manual checks pending for active-to-final transitions,
filtered page membership changes, request errors and hidden tabs. No CSS changes,
tests, lint, typecheck, build, browser checks, BE/database writes, commits or pushes.

## USER account-list empty-state consistency — 2026-11-20

The list heading and View All action now reuse the All Orders wording. Empty
states explain each existing tab separately, including the pending/cancelled/
expired/unsuccessful scope of Other Transactions, without implying attendance
from elapsed showtime. Empty later pages ask customers to return to page one
instead of claiming the entire group has no orders. Existing navigation, API
filters and responsive styles are unchanged; no new buttons or endpoints.
Source/diff review only. Manual empty-tab/later-page checks pending; no tests,
lint, typecheck, build, browser checks, BE/database writes, commits or pushes.

## USER other-transactions tab label — 2026-11-20

Renamed Unconfirmed to Other Transactions because this filter also includes
cancelled, expired, rejected and failed bookings, alongside pending reservations.
Only the label changed; API filters and responsive styles remain unchanged.
Source review only; no browser checks, tests, lint, typecheck, build, BE/database
writes, commits or pushes were run.

## USER booking-list tab wording — 2026-11-20

Renamed the four normal account-booking tabs to All Orders, Upcoming & Now
Showing, Screening Ended and Unconfirmed. Labels describe the existing filters:
UPCOMING includes confirmed screenings not yet ended, PAST includes ended
confirmed screenings, and Unconfirmed includes all non-CONFIRMED booking states.
The legacy confirmed deep-link tab is unchanged. No filter/query, routing,
responsive CSS or API changes; existing wrapping/scroll behavior is reused.
Source review only, browser checks pending. No tests, lint, typecheck, build,
BE/database writes, commits or pushes were run.

## USER one status badge per booking card — 2026-11-20

Account booking list cards show a single badge. Confirmed bookings with known
screening timing show Upcoming/Now Showing/Ended instead of also repeating
Confirmed beside it. Other bookings, or confirmed bookings without enough timing
data, retain the API booking-status label. This is display precedence only;
booking status, ticket access, filters and check-in semantics are unchanged.
Existing responsive badge styles are reused. Source review only; browser checks
pending. No tests, lint, typecheck, build, BE/database writes or commits/pushes.

## USER booking action cleanup — 2026-11-20

Removed routine Check Payment actions in checkout/result/processing (compact
account details already used conditional recovery), the payment panel's duplicate
View Order Result link and the pending-result Check Booking Status button.
Booking/payment polling and automatic result routing remain responsible for normal
progress. Manual payment checks remain for request/handoff errors, invalid provider
links, reconciliation, recorded-payment/booking conflicts and reached deadlines.

Retained seat/list refresh because these views do not have equivalent automatic
updates, plus required selection, consent/payment, cancellation confirmation,
pagination, navigation and error-retry actions. Existing conditional ticket retries
remain. No API, business mutations, responsive styling or other roles changed.
Source/diff review only; manual checkout/pending/error/reconciliation checks remain
pending. No tests, lint, typecheck, build, browser checks, BE/database writes,
commits or pushes were run.

## USER remove routine ticket refresh action — 2026-11-20

The confirmed ticket shared by result/ticket views no longer shows Update Ticket
Codes after successful loading or while issuance is automatically polled. This
action only performed a GET, never regenerated codes. Retry Loading Tickets is
retained for request errors and successful empty responses without a known
expected seat count (where issuance polling cannot run). Loading/error wording
now refers to ticket information rather than changing ticket codes.

Existing ticket GET, issuance polling, six-character booking reference and
Staff/POS printing policy are unchanged. No API/CSS changes. Source/diff review
only; browser/manual state checks pending. No tests, lint, typecheck, build,
BE/database writes, commits or pushes were run.

## USER payment error feedback consistency — 2026-11-20

If the latest payment request fails, the shared payment panel now hides its
cached payment label and normal preparation/provider/result guidance. A single
existing error alert explains that the result could not be checked; the manual
check action says Retry in checkout, result, processing and compact account views.
Successful refresh restores the API-backed label and guidance automatically.

Cached query data, handoff guards, polling and API contracts are unchanged. No
CSS or responsive layout changes. Source/diff review only; network-error recovery
with and without cached data still needs manual verification. No tests, lint,
typecheck, build, browser checks, BE/database writes, commits or pushes were run.

## USER payment consent follows checkout state — 2026-11-20

The shared booking payment panel no longer asks for pre-payment consent when
the API reports SUCCEEDED, FAILED, EXPIRED or RECONCILIATION_REQUIRED while
the booking still reports RESERVED. Request errors also hide that consent;
existing result/retry guidance remains available. Consent remains available
during preparation and provider handoff within the API hold deadline.

Only consent visibility changed; provider handoff guards, polling, saved consent,
API contracts and responsive styles are unchanged. Compared with the local
reference checkout and current generated/BE payment enums. Source review only;
manual state-transition checks remain pending. No tests, lint, typecheck, build,
browser checks, BE/database writes, commits or pushes were run.

## USER reserved-detail copy at deadline — 2026-11-20

The account-detail heading/help text now distinguishes a still-active reserved
hold from its API-provided deadline passing while BE still reports RESERVED.
After that deadline it asks the customer to check the result rather than also
encouraging payment; active countdown/payment help is omitted during payment
review. Booking status is never changed locally. The existing cancellation time
guard is reused through a shared computed flag without changing eligibility.

Saved-seat groups with missing/mixed unit metadata use "đơn vị" instead of
guessing "ghế"; explicit PAIR/SEAT still display cặp/ghế. No new API, business
mutation, CSS or role changes. Manual checks pending: deadline transition,
payment review during a hold and legacy unit metadata. No tests/lint/typecheck/
build/browser checks, BE/database writes, commits or pushes were run.

## USER account detail unavailable state — 2026-11-20

Invalid account-booking links and 403/404 responses now use the shared empty-state
component with the existing Back to List route. Protected cached booking content
is no longer exposed by the detail model after those responses; any open cancel
confirmation is closed and payment display state cleared. Transient network
errors keep the existing loaded-data/retry behavior. No request, permission rule,
cancel mutation, responsive token or other role was changed.

Manual checks pending: invalid UUID, missing/unauthorized booking, a 403/404 after
cached success, open cancellation confirmation when access changes and a network
error/retry. Source review only; no tests/lint/typecheck/build/browser verification,
BE/database writes or commits/pushes were performed.

## USER transaction-detail restart consistency — 2026-11-20

Account booking details now receive payment status/check readiness from the
existing compact payment component. Their Choose Another Showtime link uses the
same feature helper as the result page: cancelled/expired orders wait for a fresh
payment check, pending/reconciliation/recorded-payment outcomes do not offer a new
booking, and rejected reservations retain their retry path. The account status
heading/description explains reconciliation or payment-success/booking conflicts.
Payment display state resets when changing booking or account.

Extracted only the existing result-page UI predicates; no new API, mutation,
backend business rule, role scope or responsive style was introduced. Confirmed
orders still show View Ticket/Back to List without extra routine checks. Source
review only; pending/error/provider cases have not been runtime verified. No tests,
lint, typecheck, build, BE/DB writes, commits or pushes were run.

## USER transaction-detail mobile verification — 2026-11-20

Reopened the actual B66F05 account-booking detail in Edge. After explicitly
reinitializing device emulation, observed the current layout at 430×932 and
375×667 without the earlier horizontal clipping. Header/back link wrap on the
smaller viewport; confirmed status retains one View Ticket action. Saved couple
seat I4, two guests, 150,000 VND total and six-character references fit within
the cards. Opened Transaction Times and observed created/hold/confirmed values.
Routine payment-check/result/update actions remain absent for this confirmed order.

No further application-code edits were needed for this verification. This closes
the narrow-layout uncertainty recorded in the earlier account-detail section for
this booking and these viewports; reserved/error/other-provider states remain
unverified. Only this status document changed in the turn. No tests/lint/typecheck/
build, payment/cancel/print actions, BE/database writes or commits/pushes were run.

## USER transaction-detail actions — 2026-11-20

Removed the always-visible Update Status action and duplicate footer navigation
from account booking details. Confirmed orders keep View Ticket and Back to List.
The shared payment component has an opt-in compact display for this page only:
it omits result/checkout navigation and routine payment-check buttons, keeping a
single Check Result/Retry action for reconciliation, recorded-payment conflicts,
deadline recovery or request/handoff errors. That action still refreshes both
payment and booking. Reserved orders retain consent, valid provider handoff and
the cancel-reservation action; existing polling remains active.

Checkout/result pages do not enable compact mode. No API/business-state changes,
new dependencies or Staff/POS/User-print changes were introduced. Source review
only; no tests/lint/typecheck/build were run.

## USER account booking detail UI — 2026-11-20

Opened the requested `/account/bookings?bookingId=...b66f05` in Edge and observed
a confirmed transaction with an oversized result hero/progress above the actual
details and a full showtime UUID. Replaced the history-detail hero with a compact
status card, promoted the real View Ticket link, removed booking-step progress
from this page, shortened the displayed showtime reference to six characters and
grouped all audit timestamps in an expandable transaction timeline. Seat groups,
saved prices, payment, refresh and cancellation controls remain intact.

Detail-only CSS keeps the list layout unchanged, constrains grid children and
wraps the status/action area on mobile. Desktop changes were observed after HMR
on the actual booking: summary/details are visible much earlier. Mobile emulation
showed horizontal clipping; narrow-width rules were added but a clean final
mobile verification is still required. Other booking states/timeline interaction
were not runtime verified. No tests/lint/typecheck/build, payment/cancel actions,
BE/DB writes or generated-client edits were performed.

## USER processing deadline feedback — 2026-11-20

When a reserved booking/payment reaches its API-provided deadline, the processing
view now exposes its existing status/check-payment controls instead of showing
only a spinner. Checkout also hides consent/provider handoff controls after that
deadline; the existing canPay guard remains unchanged. The notice uses a live
status region. No booking/payment state is locally marked expired, no hold is
invented or extended, and backend results remain authoritative.

Manual checks pending: RESERVED reaching the earlier booking/payment deadline,
processing without a payment response yet, explicit failed/expired/succeeded
responses and checking again. No tests/lint/typecheck/build/browser checks were
run; no BE/DB/generated changes or User print actions were added.

## USER payment-result retry consistency — 2026-11-20

Result headings/descriptions prioritize reconciliation or recorded payment when
the booking is not confirmed, including cancelled/expired booking conflicts.
Choose Seats Again is withheld in those states. For cancelled/expired orders it
also waits for a fresh successful payment check and does not appear while the
provider is still processing, while a request fails or while refetching. A rejected
reservation keeps its existing retry path because no payment lookup is enabled
for it. Confirmed bookings remain the authority for ticket access.

BookingPayment exposes whether its existing GET check completed; no new endpoint
or mutation was introduced. Manual checks pending: expired/cancelled orders with
failed/expired/missing payment, pending provider, SUCCEEDED/reconciliation, failed
GET/retry and confirmed result. No tests/lint/typecheck/build/browser checks or
payment/database operations were run. Responsive layouts and User no-print policy
are unchanged.

## USER order route recovery states — 2026-11-20

Invalid booking links and owner-unavailable (403/404) responses now show a titled
empty state with real links to booking history and showtimes. Other request errors
retain retry and add a history exit. Cached booking content is hidden after an
authorization/not-found response; transient errors retain existing disabled-data
behavior. Checkout/result/ticket loading without a booking has a page heading,
while processing keeps its own heading. Recovery controls wrap using existing
tokens. No API, business rule, Staff/POS or generated-client changes were made.

This change was inspected in source only. The prior browser session was stopped
by Computer Use URL-confidence enforcement; no runtime verification is claimed
for these recovery states. No tests/lint/typecheck/build were run.

## USER booking dates observed in browser — 2026-11-20

Opened the actual customer ticket route ending C087B6 in Edge after the user
completed login manually. Observed three issued seat units/four guests, the short
booking reference and absence of a User print action. The date was rendered as
"11-17, Thứ 3" by the browser's locale formatter. Added a booking-only calendar
mapper with explicit Vietnamese weekday and DD/MM/YYYY, preserving cinema-local
date keys without device-timezone conversion. Applied it to seat/checkout recaps,
review labels, ticket/history cards and saved-showtime summaries; Admin/Staff and
the shared calendar formatter are unchanged.

After HMR, observed "Thứ 3, 17/11/2026" on the actual ticket and saved-showtime
details in desktop and 430×932 device emulation. This does not validate other
checkout/result states, partial issuance, error handling or a payment transaction.
No tests/lint/typecheck/build, BE/DB writes or generated-client edits were run.

## USER awaiting issued tickets auto-refresh — 2026-11-20

Confirmed tickets now refetch the existing tickets GET every three seconds only
while a known saved seat count is not yet fulfilled. Polling stops on completion,
request/validation errors or disabled/changed ownership and does not run in the
background. The UI announces pending issuance; background reads keep the existing
ticket/card content and do not spin the manual refresh button. Manual refresh
awaits an in-flight request rather than cancelling/duplicating it. Unknown seat
counts retain explicit manual refresh instead of guessing readiness.

No booking QR contract, print action or new endpoint was added. Manual checks
pending: empty → partial → complete ticket responses, error/retry and hidden tab.
No tests/lint/typecheck/build/browser checks were run. Existing generated User
Service changes in the working tree were preserved.

## USER partial ticket issuance — 2026-11-20

Booking-level QR contract is still absent from the generated client/backend
controllers. The existing ticket GET now checks seat IDs, numbers and capacity
against the confirmed booking snapshot and rejects duplicate/unexpected tickets.
The customer card distinguishes partial issuance from a fully returned set using
the saved seat count (units, not number of guests); failed refreshes do not show
a competing success count. No new endpoint, QR payload or Staff/POS action was
added. User print remains absent and short references remain six characters.

Manual checks pending: zero/partial/full issuance, couple-seat capacity, mismatched
ticket data and failed refresh. No tests/lint/typecheck/build/browser checks were run.

## USER short booking references and BE pickup proposal — 2026-11-20

Visible booking references in processing, result, ticket and customer history
details now use the uppercase last six UUID characters (example C087B6). Full
IDs remain unchanged in routes, requests, state and query keys. A feature mapper
centralizes formatting; the suffix is not a unique identifier or credential.
USER_BOOKING_FLOW.md includes a proposed booking pickup QR, authorized Staff/POS
lookup of all tickets and idempotent print-job contract, explicitly not implemented
API endpoints. User printing remains absent. No tests/lint/typecheck/build/browser
checks, backend/database writes or generated-client edits were performed.

## USER one booking pickup QR requested — 2026-11-20

User requests one booking-level QR scanned by Staff/POS to print all tickets.
Removed the per-ticket ID list from the customer ticket code panel, retaining
one booking reference and actual issued-ticket count. Current QR/lookup contract
is per ticket, not a booking-wide print handoff; no arbitrary booking UUID QR or
first-ticket substitution was introduced. Booking QR rendering is not complete.
Required BE/Staff/POS contract and dependency constraint are recorded at the top
of USER_BOOKING_FLOW.md. No tests/build/browser checks or BE/DB changes were made.

## USER issued tickets API — 2026-11-20

The current generated client now provides getBookingTickets. Compared it with
BookingTicketController/BookingTicketService and connected the existing confirmed
ticket card to this owner-scoped GET API. The view lists real ticket IDs, seats,
capacities and ISSUED/USED labels, with loading, empty/issuance-pending, retry and
refresh states. Ticket QR credentials are not stored in query results or rendered
as text. User printing remains absent; Staff/POS were not changed.

QR payload is now available from BE, superseding the old missing-API note. A real
QR renderer is still pending; no fake QR or new dependency was introduced. BE
also returns checkedInAt, which is absent from the current generated TicketResponse;
this view does not read that field or modify generated files.

Manual checks pending: owned confirmed result/ticket with no tickets, issued or
used tickets, failed request/retry, mobile and changing account. No tests/lint/
typecheck/build/browser checks or payment/database operations were run.

## USER booking screening metadata — 2026-11-17

Booking summary, saved-showtime details and confirmed ticket now share a booking
feature mapper for the generated screening-version DTO. It distinguishes 2D/3D
from IMAX/4DX/ScreenX and labels audio, dubbing, subtitle language or explicit
NO_SUBTITLES from returned data. Missing values are omitted without defaulting
format or language. Long labels wrap within summary/ticket layouts. User ticket
printing remains removed; Staff/POS and API contracts are unchanged.

Manual checks pending: available 2D/3D/special projection, dubbed/subtitled/no-
subtitle versions, missing metadata and mobile summary/ticket. No tests, lint,
typecheck, build or browser verification were run.

## USER ticket viewing only — 2026-11-17

User instruction supersedes the reference's print action: ticket printing belongs
to Staff/POS. Removed the User Print button, window.print handler, print-readiness
events/state/messages and dedicated printable ticket CSS. Ticket viewing, missing
data/retry states and mobile layout remain. Staff/POS and APIs were not changed.
This supersedes the older print-readiness section below.

Manual check pending: confirmed result and ticket pages offer viewing/navigation
without a Print action. No tests/lint/typecheck/build/browser checks were run.

## USER confirmed-ticket print readiness — 2026-11-17

Confirmed ticket cards expose whether their existing context query and saved
seat/price data are ready for printing. The result/ticket page disables its Print
action until that state is ready, resets it when changing bookings and retains
the booking-status/owner guards. Ticket dates now distinguish loading from missing
context, and an inline notice explains why printing is unavailable. Mobile ticket
headers wrap instead of squeezing the brand and confirmation label.

Manual checks pending: confirmed result/ticket on slow or failed context requests,
retry then Print, changing booking IDs, mobile header and browser print preview.
No new API calls/contracts or QR data were introduced. No tests/lint/typecheck/
build or browser verification were run. Previous working-tree changes are kept.

## USER existing-order mobile checkout recap — 2026-11-17

The saved-booking checkout now reuses the same mobile recap as draft checkout.
Seat numbers, currency and total come from the saved booking; absent pending data
is labelled as awaiting confirmation. The summary anchor is explicit, and both
recap controls move keyboard focus as well as scrolling to it. Existing reduced
motion and sticky-header offsets are retained. Checkout bottom spacing includes
the device safe area. No payment action, endpoint or result handling changed.

Manual checks pending: both checkout URL variants on mobile, long movie/cinema/
seat labels, pending and reserved orders, keyboard summary navigation and safe
area. No test, lint, typecheck, build or browser verification was run.

## USER booking/payment reference pass — 2026-11-17

Reviewed the Lumière booking, checkout, processing, result, ticket and order
templates, responsive CSS and local demo assets against current routes/contracts.
Checkout now keeps its summary present while data/quote load, uses a semantic
payment form with a full-width icon action and reference-sized heading tokens.
Draft checkout can return to seats through progress before submission; progress
navigation locks with uncertain/submitted requests. Seat-step change-showtime
navigation preserves its existing movie/date destination. Processing/error focus
is explicit without unmounting the request owner or changing payment behavior.

Existing real API wiring and result/ticket layouts are retained. Food, vouchers,
recipient snapshots, guest booking and QR/check-in remain contract gaps; no fake
fields, endpoints, totals or results were added. Full route mapping and manual
checks: `USER_BOOKING_FLOW.md`. No tests/lint/typecheck/build/browser verification
or payment transactions were run. Existing working-tree changes are preserved.

## USER quick-booking stale selection — 2026-11-17

Quick Booking now compares the selected slot's room, start/end and screening
metadata after its existing availability refetch. Changed details clear only the
showtime selection and ask for review; unchanged slots continue to seat selection.
Checks also stop after route/cinema/movie/date changes, preserving newer user
choices. Existing loading, error, dropdown, keyboard and responsive UI remain.
No new endpoint, generated-client edit or backend dependency was introduced.

Manual checks pending: normal Continue, a modified/removed selected slot, failed
request, changed cinema and leaving during a slow request. No tests/lint/typecheck/
build or browser verification were run.

## USER movie-detail schedule selection — 2026-11-17

Movie-detail schedules now also require reselection when the clicked slot's room,
time or screening metadata changes during the existing availability refetch.
Changed routes/scopes and component disposal prevent late booking navigation;
router navigation failures have explicit feedback. The existing feedback line
announces checking/opening seat selection, with `aria-busy` on the clicked slot.
No API client, backend contract or responsive layout changes were needed.

Manual review pending: unchanged/modified/removed slots, failed requests, leaving
the movie page during a slow check and keyboard use. No tests/lint/typecheck/build
or browser verification were run. Preexisting generated-client changes are kept.

## USER stale schedule selection guard — 2026-11-17

The shared customer schedule compares the clicked slot with the existing
bookable-showtimes refetch before entering booking. Changed movie, room, start/end
or screening metadata now asks the user to review the updated list and select
again. Missing/started slots and request failures have separate feedback. A
pending check cannot navigate after component disposal, route changes or changed
schedule scope. No extra endpoint, DTO or booking operation was introduced.

Manual checks pending: change a displayed slot while its page remains open, then
select it; simulate a failed request; leave the page during a slow check; verify
an unchanged slot still reaches seat selection. Visual slot content and responsive
styles are unchanged. No tests/lint/typecheck/build/browser checks were run.

## USER schedule selection feedback — 2026-11-17

Selecting a schedule slot now shows a shared live status while the existing API
availability check and booking navigation run. Buttons retain only time/format
visually; accessible names include the group, cinema-local date, time and format.
Poster alternatives use the movie title. Router navigation failures receive an
inline error instead of silently returning to the schedule. Existing click guards,
API queries and responsive styles are retained.

Manual checks pending: click a slot on a slow connection, keyboard/screen-reader
selection, failed availability request and blocked navigation, in standalone and
embedded schedules. No tests, lint, typecheck, build or browser checks were run.

## USER schedule slot layout — 2026-11-17

Schedule slots show only real start time and content/projection format. Compact
equal-width buttons reuse Lumière tokens with hover, keyboard focus and checking
states. On mobile, poster/title share the first row and times use the full card
width below them; groups without posters keep a single-column header. Long titles
and addresses wrap rather than forcing horizontal overflow. APIs and booking
selection behavior are unchanged.

Manual review pending: `/showtimes` in movie/cinema modes and embedded cinema
schedule at narrow/mobile widths, long titles, keyboard focus and selecting a slot.
No tests, lint, typecheck, build or browser verification were run for this change.

## USER movie-card booking entry — 2026-11-17

Home and catalogue/search movie cards now send the Now Showing "Đặt vé" action
to the movie detail page's existing `#movie-showtimes` section. Poster/title links
still open the movie overview; Upcoming cards retain their detail action. This
matches the reference card's distinct booking entry without adding a new booking
step or changing availability/API rules. Existing customer layout anchor handling
waits for initial page data and focuses the schedule below the sticky header.

Manual checks: use a Now Showing card from Home, Movies and Search; confirm the
schedule is reached after loading; compare poster/title and Upcoming links; try
keyboard navigation, mobile and Back. No tests/lint/typecheck/build were run and
runtime/browser verification remains pending. No backend changes are required.

## USER movie catalogue URL filters — 2026-11-17

The Movies page now reads search (`q`), genre, sort, status and pagination (`page`)
from the route query. Search replaces the current history entry; status, genre,
sort and page changes create history entries for Back/Forward. Filter changes
reset pagination in the same navigation. Pending navigation queries are merged
so rapid input does not overwrite another filter, and updates stop after leaving
the Movies route. A failed navigation shows an accessible inline error.

Requested pages are clamped against the loaded results without rewriting the URL
while data is pending. Unknown genre selections remain visible and removable.
Existing API queries, catalogue cards, responsive layout and loading/error/empty
states are retained. No backend contract or generated client changes are needed.

Manual checks: open `/movies?q=phim&sort=title-asc&page=2`, change filters, reload,
use Back/Forward, clear search, change cinema, and test a nonexistent genre/page.
No tests, lint, typecheck or build were run; browser verification remains pending.

## USER filter and anchor scrolling — 2026-11-17

Customer route scrolling now preserves the current position on same-path query
updates, so URL-backed date/format/cinema/ticket-tab/search changes do not jump to
the page hero. Existing visible in-page hash targets scroll/focus natively with
their CSS scroll margins; Back/Forward uses router saved positions. New paths keep
the normal top-of-page behavior and initial-data hash focus remains in the customer
layout. Admin/auth scroll behavior is unchanged.

Movie-showtime anchor margin now follows the desktop/mobile customer header height
instead of a fixed offset. Manual checks: scroll to movie schedule → change date/
format/cinema; ticket tabs and search pagination; Choose Showtime anchor; history
Back/Forward including long async pages, keyboard and mobile sticky header.

Browser access was attempted but the browser access host was unavailable, so no
visual/runtime validation is claimed. No tests/lint/typecheck/build, API mutations,
BE/generated/reference edits, database changes, commits or pushes.

## USER registration and verification form feedback — 2026-11-16

Email verification now uses a reusable password input with an accessible reveal
toggle, native autocomplete/required attributes and focus styling matching the
existing form. Passwords reset to hidden when cleared. Validation marks only the
relevant field, connects its error description and clears stale local errors on
edit. The 12-character/72-byte UTF-8 rules and generated confirmEmail request remain
unchanged; credentials/tokens are not persisted or logged.

Registration focuses its accepted/server-error feedback after the real response;
verification focuses success or the password field after a failed API attempt.
General registration messages do not infer account existence; verification still
clears passwords, keeps fragment-token handling and does not auto-login/resend.
Fixed an undefined font-weight token in the shared registration styling.

Manual checks: keyboard reveal toggles and focus, short/over-byte-limit/nonmatching
passwords, correct invalid field, API errors, 202 registration/204 verification,
missing/expired token, no login token, mobile layout and pending disabled fields.
No tests/lint/typecheck/build or browser/API mutation verification performed;
no BE/generated/reference edits, database changes, commits or pushes.

## USER keyboard page navigation — 2026-11-16

Customer layout now exposes Lumière's skip-to-content link and a focusable main
landmark, and updates browser titles from customer route metadata. On path changes
it waits for the existing page-loading state and DOM render before focusing the
new heading/main or an existing named hash target. Query/filter changes do not
restart focus; active form fields, dialogs and explicit header-search focus are
preserved. Title handling is scoped to the customer layout and restores the prior
title on disposal without changing Admin/auth layouts.

Manual checks: first Tab reveals skip link, activation skips desktop/mobile
navigation, route loading → heading focus, title per page, header search → input,
Back/Forward, hash links, form typing and open dialogs. No tests/lint/typecheck/
build or browser verification performed. Existing profile/404 modifications were
preserved; no BE/generated/reference edits, database changes or commits/pushes.

## USER not-found and profile feedback — 2026-11-16

Catch-all customer route now renders Lumière's dedicated 404 screen with home
and support actions; auth/permission PlaceholderPage usages remain unchanged.
Profile save success now uses the existing four-second success toast after a
successful real response, rather than a persistent form paragraph. Field/API
errors remain inline for correction; reset/new submission dismisses old success.
Customer-only viewport styling positions teleported toasts below desktop/mobile
headers without changing Admin toast placement.

Manual checks: unknown URL → home/support; desktop/mobile 404; valid profile edit
→ successful save toast → expiry; reset/new save; API failure and validation should
not report success; header offset and keyboard dismissal. No tests/lint/typecheck/
build or browser verification performed. Existing booking/generated changes were
preserved; no BE/MySQL/reference edits or commits/pushes.

## USER screenings in progress — 2026-11-16

Current BE periods still use the stored showtime end, so labels now say Not Ended
and Ended rather than Upcoming/Watched. Existing `upcoming`/`past` URLs and period
requests remain compatible. Confirmed ticket cards show a separate time-phase
badge (upcoming, ongoing, ended) when real timestamps permit; this is presentation
from the shared page clock, not a payment/booking/check-in status or a server tab
filter. End prefers the booking snapshot; start comes from existing showtime
context. Missing or contradictory timestamps do not fabricate an ongoing phase.

When an end boundary is reached in Not Ended, a deduplicated GET refetch updates
server-filtered content and totals; cards are never moved or filtered locally.
API errors retain the normal retry flow. Separate server-backed upcoming/ongoing
tabs still require BE start-time filtering. Manual checks: before start, during
screening, exact end, refresh and pagination, missing context, device clock offset,
API error and status badges remaining distinct. No tests/lint/typecheck/build or
browser verification performed; existing generated backfill changes were preserved.

## USER upcoming/past ticket tabs — 2026-11-16

Integrated generated `FindAllBookingsPeriod` and `BookingResponse.showtimeEndsAt`
after reading BookingController and BookingServiceImpl.findHistory. The BE filters
CONFIRMED bookings with a non-null stored showtime end before pagination: UPCOMING
means end > server time; PAST means end <= server time. FE sends period/status as
generated types and includes period in the owner-scoped query key. It does not
classify tickets against the browser clock or filter a single page locally.

Primary tabs now match Lumière: Upcoming (default), Past and Unfinished. All
remains available to find older confirmed bookings without a stored end timestamp;
legacy `tab=confirmed` links retain their unfiltered confirmed view. UI copy states
that Past is a time classification, not a check-in/used-ticket claim. Tab changes
still reset pagination, and reload/Back/Forward, empty/error/retry flows remain.

Manual checks: `/account/bookings`, `?tab=past`, `?tab=unfinished`, `?tab=all`,
legacy `?tab=confirmed`; network period/status, totals across pages, page reset,
older null-end records via All, exact end boundary per BE and account ownership.
No tests/lint/typecheck/build or browser verification performed. No generated,
BE/MySQL/reference changes, commits or pushes.

## USER movie schedules across city cinemas — 2026-11-16

Movie detail now offers All Cinemas in the selected city and groups matching
showtimes into cinema panels, following Lumière. Explicit `cinema=all` is UI URL
state only; each real bookable-showtime request still supplies a valid cinema ID.
Existing single-cinema selection and date/content-format URL filters are retained.

Movie schedule context queries combine existing showtime reads with cached active
room metadata. Partial cinema failures retain successful schedules with retry;
room metadata failure does not suppress available slots. Choosing a slot refetches
only its cinema, validates movie/cinema/day/format and availability, then selects
that cinema through the existing location store before normal booking navigation.
No made-up endpoints, room types, prices or booking states are introduced.

Manual checks: All/single cinema; date/format; header city and Back/Forward;
partial schedule and room failures; recheck only the clicked cinema; unchanged
room labels; empty schedules and mobile panels. No tests/lint/typecheck/build or
browser verification performed. Existing generated booking contract changes were
preserved without edits; no BE/MySQL/reference changes or commits/pushes.

## USER schedule URL state — 2026-11-16

Change Showtime from the seat map opens `/showtimes` with the original movie and
cinema-local date, in movie mode. CustomerSchedule now reads its mode, movie,
cinema, date and content-format controls from URL query state, so reload and
Back/Forward restore the selected filters. Cinema lookup uses existing active
catalogue data; header city changes release an incompatible pinned cinema.

Embedded cinema schedules retain their fixed cinema, update only their existing
page query and ignore hidden format filters. Initial movie fallback no longer
pushes navigation automatically. Duplicate navigation is ignored, navigation
failures remain visible, controls lock while updating/checking and format becomes
part of the scope checked before booking. No API contract or business state change.

Manual checks: future-dated booking → Change Showtime; select both schedule modes,
movie/cinema/date/format; reload and Back/Forward; change header city; clear movie;
embedded cinema date selection; repeated date selection and navigation failures.
No tests/lint/typecheck/build or browser verification performed; no BE/generated/
reference edits, database changes, commits or pushes.

## USER movie-detail schedule filters — 2026-11-16

Movie detail now has the reference format selector alongside cinema/date, within
the reference-style filter bar. Uses generated screening-version content-format
values, derives available options from returned bookable showtimes and provides
an All Formats action when the selected format has no matching slot. Slot captions
include actual format, audio language, presentation and existing room details.

Date, cinema and format use URL query parameters (`date`, `cinema`, `format`) for
reload/sharing and Back/Forward. Active cinema links are resolved from the public
catalogue and synchronized with location selection; changing header city releases
an incompatible pinned cinema. Re-selecting the same filter avoids duplicate
navigation errors. Selection still rechecks availability and the selected format
before continuing through the existing booking/auth flow.

The view still shows the selected cinema rather than aggregating all cinemas in
the city; no new endpoint or fabricated showtime state was introduced. Manual
checks: valid shared URL, date/format/cinema changes, Back/Forward, header city,
empty format, repeated day selection, API errors and booking recheck. No tests,
lint/typecheck/build or browser verification performed; no BE/generated/reference
edits, database changes, commits or pushes.

## USER trailer dialog — 2026-11-16

Hero, shared movie cards (home/catalog/search) and movie detail now use one Reka
trailer dialog following the reference modal title/player/close/action layout.
Uses the existing MovieResponse.trailerUrl and poster, with direct MP4/WebM/Ogg
video or YouTube embed URL according to the official player documentation. Other
HTTP(S) sources retain an original-link fallback; no demo clip or captions are
invented. Player resources mount only after the user opens the dialog and unmount
on close/navigation. Hero auto-advance pauses while the dialog is open, and the
clicked film is snapshotted to avoid switching videos during catalogue updates.

Includes native-video loading/error feedback, keyboard close/focus through Reka,
responsive scrolling dialog and original-source link if embedding is unavailable.
YouTube load does not imply playback success; provider restrictions remain visible
in the embedded player, with original link available. No autoplay or extra SDK.

Manual checks: open from hero/card/detail, close via button/Escape/outside click,
focus return, hero pause/resume, route change stops playback, valid/unavailable
video, YouTube links and unsupported source fallback, desktop/mobile. No tests,
lint/typecheck/build or browser/media runtime verification performed. No BE/API
contract/generated/reference edits, database changes, commits or pushes.

## USER booking status tabs — 2026-11-16

The regenerated customer booking list now supports repeated status parameters.
Integrated this contract after checking BookingController and the repository-backed
status filter before pagination. Added Reka tabs: All, Confirmed and Unfinished
(all current booking statuses other than CONFIRMED). No per-page client filtering
or fabricated counts. Query keys include normalized status sets; response validation
checks owner, requested page and selected statuses.

Selection and page are URL-backed on `/account/bookings?tab=confirmed` or
`?tab=unfinished&page=2`; changing tab resets page. Includes error/retry, empty
filtered results, an All action and keyboard/mobile tab navigation. Existing
detail/payment/cancel flows are retained. Reference's Upcoming/Past labels remain
deferred: status filtering alone cannot classify by showtime/check-in correctly.

Manual checks: all/confirmed/unfinished, repeated status query parameters and
server totals, pagination reset, Back/Forward, filtered empty results, account
switch and cancellation then list refresh. No tests/lint/typecheck/build or browser
verification performed; no generated/BE edits, database changes or commits/pushes.

## USER global search — 2026-11-16

Added `/search?q=...` matching Lumière's search heading, keyword form and separate
movie/cinema results. Reuses the existing public movie catalogue mapper/query,
CatalogMovieCard, cinema catalogue and AppPagination; matching accepts Vietnamese
with or without accents. Search covers the available system catalogue rather than
the currently selected cinema, and cinema matches include city/address.

Query and independent result pages are URL-backed (`q`, `page`, `cinemaPage`) for
Back/Forward. Movie query accepts an optional enabled flag (existing callers keep
the default); blank search does not trigger it. Header search now opens/focuses
the new search form after page loading; footer links to search. Includes partial
API failures with retry, empty state, mobile layout and no fabricated results.

Manual checks: header search, submit accented/unaccented keywords, movie/cinema
detail links, independent pagination, Back/Forward, reload shared URL, clear query,
API failures and mobile focus. No tests/lint/typecheck/build or browser verification
performed; existing generated-client changes were preserved without edits.

## USER experiences — 2026-11-16

Added `/experiences`, linked from desktop/mobile primary navigation, footer and
cinema detail. Follows Lumière's numbered experience tile grid (3/2/1 columns).
Available room types, formats and cinema links are derived from active cinemas
and their active-room APIs, reusing existing room query keys. No mock cinema,
availability, pricing or unsupported bed-room type is introduced. Descriptions
avoid unverified equipment/amenity claims.

Includes initial loading, cinema-catalog errors, partial room-query errors with
retry, empty data and retained successful results. Existing APIs require one room
request per cinema; there is no new endpoint. Manual checks: `/experiences`,
navigation on desktop/mobile, card cinema links → detail → schedule, empty room
data and partial failures. No tests/lint/typecheck/build or browser verification
performed; no BE/generated/reference changes, commits or pushes.

## USER support pages — 2026-11-16

Added `/support`, `/support/guide`, `/support/contact` with Lumière's support
heading, sticky sidebar, grouped FAQ and guide panel. FAQ uses Reka Accordion;
mobile navigation scrolls horizontally. Operational copy follows the real flow:
authentication, server hold deadline, quote recheck, payment processing and
confirmed-booking ticket access, without demo limits, prices or policies.

Contact shows published cinema details through existing public cinema APIs;
there is no fake support submission or demo hotline/email. Footer links now open
all three pages; unconfirmed booking results link to contact. Legal/demo policy
pages remain excluded because demo copy is not a production policy.

Manual checks: footer navigation; expand FAQ with keyboard; guide → booking;
contact cinema selection, valid tel/mail links, empty contact fields and API
retry; mobile sidebar and loading. No test/lint/typecheck/build or browser
verification performed; no BE/generated/reference edits, commits or pushes.

## USER cinema detail — 2026-11-16

Added `/cinemas/:cinemaId`, linked from the cinema list, following Lumière's
cinemaDetail cover, information panels and movie-grouped schedule. Cinema,
amenities, active rooms and bookable schedules use existing generated APIs.
The cover uses the existing illustration because CinemaResponse has no cover
image. Missing contact/directions data is not invented. Includes invalid/inactive
cinema, loading, retry, empty schedules and mobile layouts.

CustomerSchedule is extracted from ShowtimesPage and reused through the home
feature's public export; the normal schedule keeps its filters, while cinema
detail pins the cinema and shows the date strip. Choosing a slot rechecks current
availability before the existing booking route. Login error initialization now
respects the explicit sign-in redirect failure flag used by the route guard.

Manual checks: cinema list → detail → change date → select a slot; verify the
cinema remains pinned even if the header city changes; check inactive/invalid IDs,
API errors, empty amenities/rooms, mobile and keyboard focus. Existing login
redirect failure should still show its error and retry. No test/lint/typecheck/
build or browser/runtime verification performed; no BE/generated/reference edits.

## USER payment processing screen — 2026-11-13

Pay now switches draft checkout into the reference processing view immediately
while quote/create is running, keeping the request component mounted. After BE
returns an ID, `/booking/processing/:bookingId` continues owner-scoped booking and
payment reads. The shared BookingProcessing view follows resultPage's spinner,
heading/copy and mobile sizes; no artificial success or minimum wait. Errors return
to checkout/retry or show recovery controls, with idempotent payload preserved.
Results still require authoritative BE status; ticket access requires CONFIRMED.
Syntax/diff checks only; no tests/build/typecheck, browser or payment transactions.

## USER seat-to-checkout navigation — 2026-11-13

Continue on the seat page now navigates directly to
`/booking/checkout?showtimeId=...`, without a review modal, quote or create mutation
on the seat page. Draft checkout owns quote review, provider selection and consent;
only its explicit confirmation submits a booking. Session-scoped selection restores
on Back/reload by owner/showtime. Existing idempotent requests are retained unchanged.
Prices are rechecked and changes require confirmation again. Async quote callbacks
cannot submit after leaving the page. A one-use in-memory payment intent carries
explicit consent through the created-order route to the real provider URI once ready;
it is not restored by URL/reload and is cleared on account changes/navigation.
Checkout/result/ticket routes for existing orders remain supported; no demo cap of 8.
Verification: Vue/TS/CSS syntax and diff checks only; no tests, lint, build, typecheck,
browser/payment transaction was performed in this change.

## USER checkout/result/ticket UI — 2026-11-12

Checkout and result now use a dedicated BookingOrderPage following Lumière
checkout/result structure instead of the account order-management view. A new
authenticated `/booking/ticket/:bookingId` displays confirmed booking information
in the reference ticket layout, with browser printing and links from confirmed
orders. No fabricated QR or ticket-usage data is issued. Unconfirmed ticket
routes go to result after a successful booking read; final checkout states also
go to result. Payment result remains distinct from booking confirmation.
Generated/source VNPAY/MOMO provider selection is captured before creating an
order, preserved during retry and shown on checkout. No eight-customer demo cap.
Tests, lint, typecheck, build, browser/payment/print runtime checks were not run.
See USER_BOOKING_FLOW.md for contract limitations and manual checks.

## USER payment checkout integration — 2026-11-12

Current source/generated now include the authenticated owner checkout read API.
FE wires it through a booking feature query and payment panel, with dedicated
`/booking/checkout/:bookingId` and `/booking/result/:bookingId` routes sharing the
existing order view. Old detail links remain supported. Pending payment preparation,
provider handoff, success awaiting booking confirmation, failures/expiry/reconciliation,
retry and deadline gates are handled without simulating payment or issuing QR codes.
The seat page adds a mobile recap with the same checkout action instance.

No demo limit of eight customers is imposed. Quote allows up to 100 seat units;
Booking service's configurable maximum (default 10 units) remains authoritative.
Food, discounts, guest lookup and ticket/QR issuance still lack inspected contracts;
the full reference journey is not complete. See USER_BOOKING_FLOW.md for gaps and checks.
Verification is syntax/diff only; no tests, build, typecheck, browser or payment transaction.
The older statement below that no customer checkout endpoint exists is superseded.

## USER booking result follow-up — 2026-11-12

The booking-detail source now includes a non-polling showtime/movie/room/cinema
summary using existing generated context reads, after owner-scoped booking data
is validated. It labels current catalogue metadata separately from stored seat
fares. Detail status still follows Backend polling; the expiry clock updates
once per second. Terminal rejected/cancelled/expired orders can choose another
showtime. No USER payment initiation contract was found in current generated
clients or inspected Payment controllers/security; no simulated checkout added.

Verification is limited to syntax/diff/module transforms. No create/cancel/payment
mutations, browser interactions, tests, lint, typecheck or build were performed.

## USER profile follow-up — 2026-11-12

Current `/account` source now wires generated GET/PUT `/api/v1/users/me` after
checking CurrentUserController, profile DTOs/service and authenticated security.
It reads verified email and edits first/last names plus phone. Queries and response
identity checks are scoped to the authenticated subject. Email/username/password
are not editable in this form. The older customer account placeholder descriptions
below are historical audit findings, not the current implementation.

The Lumière form includes loading/retry, validation, pending, save feedback, undo,
owner isolation and responsive fields. No API mutations or browser/manual checks
were performed; tests, lint, typecheck and build were not run. See USER_ACCOUNT_FLOW.md.

## Last source inspection

2026-11-06 — roadmap tasks A0.1 and A0.2 (separate rounds).

A0.2 started from Frontend `8c081d0` with a clean working tree. The revisions and
uncommitted-file notes below describe the earlier A0.1 inspection.

Inspected local checkouts:

- Frontend: `E:/java/cinematic-web`, branch `main`, HEAD `667bfb94683c91c8c68d823e1e148093d01ae069`.
- Frontend origin: `https://github.com/HuyKunNe/cinematic-web.git`.
- Backend (read-only): `E:/java/cinema-system`, HEAD `ac0915521d5562d4836ab1d95a5a3883a835148a`.
- Backend origin: `https://github.com/HuyKunNe/cinema-system.git`.

No fetch was performed; these are local revisions, not a claim about the latest remote state.
The Frontend already had uncommitted changes in `package-lock.json` and generated
Movie/Inventory files. Backend had an uncommitted `note.md`. Those changes were
preserved. Findings below describe the inspected working tree, not just HEAD.

Recent source evidence includes:

- `576a110`: showtime projection and pricing selections.
- `a9ae417`: nested screening versions in movie create/update and refreshed showtime options.
- `e0abe47`: generated Payment refund API removal.
- `d4768fc`: customer header search connected to the movie catalog.
- `bb245d5`: read-only Admin booking detail with stored seat fares.

Source inspection and OpenAPI reads do not establish successful business operations,
browser behavior, persistence round trips or automated verification.

## Working constraints

- For this task, the user authorized Frontend working-tree edits. Backend remains read-only.
- Do not overwrite existing uncommitted changes, create commits or push.
- Do not run tests, lint, type checking, build or repository-wide formatting unless requested.
- Do not modify generated API files manually or add dependencies without approval.
- R28 Notification remains deferred; do not add its UI, routes or clients.

## Architecture and visual source

Use `package.json` and `package-lock.json` for actual dependency versions and scripts.
Bootstrap remains in `src/main.ts` and `src/App.vue`; routes are in `src/router/index.ts`.
Vue Query owns server state; Pinia owns cross-route client state; feature composables
own local editor behavior. Feature queries wrap the generated Axios clients and shared HTTP infrastructure.

`npm run api` invokes Orval with `orval.config.ts`, using `axios-functions` and runtime
OpenAPI at localhost ports 8081 through 8085. Reviewed snapshots are under `openapi/`.
No generation was performed during A0.1.

Use `docs/design/reference/html-convert/README.md`, relevant HTML/CSS references and
`src/styles/tokens.css`. The reference README and room-layout HTML/CSS were read in
this audit. No UI was changed or visually verified. Reference data is illustrative.

Some guidance is stale: `docs/DESIGN_SYSTEM.md` still calls Figma the visual source,
and `docs/AI_CONTEXT.md` still describes matrix persistence as absent. Follow the
current user instructions, `AGENTS.md`, HTML references and inspected source. Figma
was not accessed. Reconciliation of those documents is outside this A0.1 change.

## Implementation and verification ledger

“API wired” means a reachable page/component calls feature queries or mutations backed
by generated clients. It does not mean the operation was exercised against Backend.
Browser/manual interaction and automated checks were not run for any row in this audit.

| Area                                                       | Code present                   | API wired in source                                                  | Browser/manual | Automated checks |
| ---------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------- | -------------- | ---------------- |
| Admin dashboard                                            | Yes                            | Movie, cinema and schedule reads; not proof of complete reporting    | Not run        | Not run          |
| Admin movies and genres                                    | Yes                            | Reads and mutations, including nested screening versions             | Not run        | Not run          |
| Admin cinemas, rooms and room formats                      | Yes                            | Management queries and mutations                                     | Not run        | Not run          |
| Admin room seat catalog                                    | Yes                            | Published seat-map reads and catalog seat activity changes           | Not run        | Not run          |
| Admin room matrix                                          | Yes                            | Load, create draft, save, publish and copy published layout          | Not run        | Not run          |
| Admin pricing                                              | Yes                            | List/detail, draft/configuration/fares, publish, lookup and previews | Not run        | Not run          |
| Admin showtimes                                            | Yes                            | Day-range list, creation, pricing assignment and opening for booking | Not run        | Not run          |
| Admin bookings                                             | Yes                            | Admin search/list and read-only detail                               | Not run        | Not run          |
| Admin payment operations                                   | Generated lookup clients exist | No payment lookup/reconciliation UI wired in inspected booking pages | Not run        | Not run          |
| Admin users and promotions                                 | Reference pages                | No management integration in those routes                            | Not run        | Not run          |
| Customer home, movie catalog/detail                        | Yes                            | Movie/programme reads and header search                              | Not run        | Not run          |
| Customer cinemas                                           | List page and cinema selection | Location/programme reads; no dedicated cinema-detail route           | Not run        | Not run          |
| Customer booking start and seat selection                  | Yes                            | Context, seat/status reads and server quote; selection remains local | Not run        | Not run          |
| Customer login/callback                                    | Yes                            | OIDC authorization code flow with PKCE                               | Not run        | Not run          |
| Customer standalone showtimes, account and booking history | Placeholders                   | No completed page integration                                        | Not run        | Not run          |

## Admin movies and screening versions

Evidence:

- `src/features/movies/admin/components/AdminMovieScreeningFields.vue`.
- `src/features/movies/admin/components/AdminMovieEditorDialog.vue`.
- `src/features/movies/admin/schemas/admin-movie-screening.schema.ts`.
- `src/features/movies/admin/api/admin-movie-queries.ts`.

The editor already has a checkbox matrix for projection technology and image format.
New rows default to STANDARD and 2D. A selected combination can contain multiple
language configurations. Persisted definitions are disabled in the editor, while
activity can be changed. Existing rows retain their ID and expectedVersion.

Create/update request mappers send `screeningVersions` within the movie request.
Validation rejects empty lists and duplicate complete definitions, including format,
projection, audio language, presentation type and subtitle language. New movie
versions must be active. These are observed code paths, not verified save results.

A1.2 already has the matrix and STANDARD × 2D default in source. A source follow-up
after A0.2 inspected MovieScreeningVersion and MovieScreeningVersionService: the current
constructor/service accepts the two format enums and four projection enums independently,
with no extra combination restriction. The current matrix therefore matches that source
policy. This does not establish room compatibility or browser verification.

### A1.3 follow-up — 2026-11-06

Started from FE `7b2357f` with a clean working tree. Inspected Backend HEAD `34fafae`
read-only, including MovieScreeningVersion, MovieScreeningVersionService and MovieErrorCode.
Backend had an uncommitted MovieScreeningVersionController change; it was not modified.

Found and corrected a remaining validation mismatch: Backend's ScreeningVersionIdentity
compares trimmed audio/subtitle languages case-insensitively, while FE previously used
case-sensitive identity keys. The feature schema now lowercases only the comparison
key, so definitions differing only in language casing are rejected before submission.
The request retains the language spelling and all existing ID/expectedVersion/active fields.
Different language configurations, formats, projections and presentation types remain
distinct; the nonempty-list rule and nested create/update requests remain in place.

Added localized messages for the existing Backend codes MOVIE_SCREENING_VERSIONS_REQUIRED,
MOVIE_SCREENING_VERSION_ALREADY_EXISTS and MOVIE_SCREENING_VERSION_SET_INCOMPLETE.
No endpoints, generated models, component markup, styles or dependencies changed.

Verification in this follow-up was static source/diff review only; no tests, build,
lint, type-check, formatter, browser interactions or API mutations were run.
Manual follow-up (pending):

1. In create and edit, add two otherwise identical versions with audio language
   `English`/`english` and subtitle language `Việt`/`việt`; saving should report a duplicate.
2. Change audio or subtitle to a genuinely different language; both versions should
   remain valid. Repeat with different format/projection/presentation configurations.
3. Remove all new versions and confirm empty-list rejection. In edit, confirm persisted
   definitions remain read-only and saving keeps all IDs, expectedVersion and active states.
4. Verify create/update send one nested screeningVersions list and no follow-up version POST.
5. Confirm the three Backend error codes show the localized messages when returned.

## Admin room matrix and catalog

The October status describing a local-only matrix and geometry-only Backend is obsolete.

Evidence:

- `src/features/rooms/admin/pages/AdminRoomLayoutPage.vue`.
- `src/features/rooms/admin/components/AdminSeatMatrixEditor.vue`.
- `src/features/rooms/admin/composables/use-admin-seat-matrix.ts`.
- `src/features/rooms/admin/mappers/admin-room-matrix.mapper.ts`.
- `src/features/rooms/admin/api/admin-room-matrix-queries.ts`.
- `src/features/rooms/admin/api/admin-room-matrix-publication.ts`.
- `src/features/rooms/admin/api/admin-room-matrix-copy.ts`.

The page loads layout versions/content and has draft creation, save, publish and copy
from published layout mutations. It checks response identity/version/content,
refreshes relevant queries and requires reload after uncertain/conflicting results.
Unsaved-change route guards remain. Published content is read-only in the editor.

The mapper preserves row/column dimensions, reconstructs null cells from indexed
seats and sends matrix dimensions plus occupied positions. Empty rows and trailing
columns do not depend on seat catalog ordering. A COUPLE seat spans two columns;
only its starting position is sent. The second cell is reserved, not a second seat.
This supersedes the old one-cell description.

Backend source now includes `RoomLayoutMatrixInput`, `RoomLayoutMatrixResponse`,
`RoomLayoutMatrixService` and matrix publication/copy support. In the inspected DTOs:

- `CreateRoomLayoutRequest` defaults `{ roomId }` to an empty 6 × 6 matrix.
- `ReplaceRoomLayoutContentRequest` accepts `expectedVersion` and `matrix`.
- Matrix and legacy geometry representations are mutually exclusive.
- Matrix dimensions are explicit; occupied seats use rowIndex and columnIndex.

Do not restore geometry persistence or infer matrix positions from catalog numbering.
The seat catalog page remains a separate management capability.
`AdminRoomCapacityCell.vue` obtains capacity/seat counts through the published-seat-map
query used by `useAdminRoomSeatsQuery`. Full A2.4 summary coverage still needs review.
A2 is no longer blocked simply by absence of a matrix contract; persistence round trips,
publication validation, conflict behavior and summaries still require verification.

## Admin pricing and showtimes

Evidence is under `src/features/pricing/admin/` and `src/features/showtimes/admin/`.

Pricing has a routed Vue page, workflow creation, configuration editing, fare matrices,
published lookup and draft/version previews. Mutations call create/replace/publish
clients. Published quote lookup uses a read-only preview. Preview labels distinguish
unpriced cells from not-applicable cells and format priced values separately.
Audit A3 criteria individually before declaring the whole group complete, especially
ID preservation, zero prices, cancel/publish behavior and independent COUPLE fares.
COUPLE prices must remain per pair and may vary by ticket group, time band and format.

Showtime list data comes from `getShowtimesByTimeRange`; remaining filters and
pagination operate locally on the returned day data. Creation loads active movies,
rooms, screening versions, published pricing versions and published seat maps.
Version labels include projection technology and image format. Compatibility filtering
uses the room's `contentFormats`; it does not prove projection-technology compatibility.
Selection watchers clear/revalidate dependent IDs. Pricing assignment and explicit
opening-for-booking dialogs call Backend mutations. A full general edit form is not
established by these operations.

## Admin booking and payment boundary

`AdminBookingsPage.vue` and `admin-booking-queries.ts` use Admin booking list/search.
`AdminBookingDetailPage.vue` and `admin-booking-detail.ts` read stored booking and seat
fare data. The detail route requires ADMIN and does not recalculate historical prices.
Backend authorization and runtime 401/403 behavior still need verification.

Generated Payment lookup clients are not proof of UI integration. No payment
lookup/reconciliation flow is wired into the inspected Admin booking pages.
Refund clients were removed in `e0abe47`; do not reintroduce refund actions without
an approved Backend contract. Admin users/promotions remain reference routes.

## Customer integration boundary

`CinemasPage.vue` is a real API-backed list, not the old cinema placeholder. It supports
search, city filtering and shared cinema selection. No dedicated cinema-detail route
was found. The standalone showtimes, account and account-bookings routes remain placeholders.

Home and movie pages use programme queries; header search routes into the movie catalog.
Booking start and movie detail provide showtime selection. OIDC uses `response_type: code`
and `oidc-client-ts`; this is not evidence of a completed account/profile page.

`booking-queries.ts` currently combines active room catalog seats with showtime seat
statuses. It does not load the showtime's matrix snapshot. Seat selection is local;
`booking-seat-quote.ts` calls `quoteShowtimeSeats` and checks per-pair COUPLE units.
The UI explicitly states selected seats have not been held. Hold/release, booking
creation, payment initiation and payment-result flows are not completed by this quote.
Do not mark U2 complete or treat catalog-based positions as the showtime snapshot.

## Runtime OpenAPI check for A0.1

Read-only HTTP GETs succeeded on 2026-11-06, using the inputs in `orval.config.ts`.
The source service configuration declares the matching service names, default ports
and `/v3/api-docs`; Movie security permits that documentation endpoint.

| Runtime URL                         | Reported OpenAPI version | Inspected schemas                                                                                   |
| ----------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `http://localhost:8081/v3/api-docs` | 3.0.1                    | CreateMovieScreeningVersionRequest, SaveMovieScreeningVersionRequest, MovieScreeningVersionResponse |
| `http://localhost:8083/v3/api-docs` | 3.1.0                    | ShowtimeScreeningVersionResponse, RoomLayoutMatrixInput, RoomLayoutMatrixResponse                   |

All four inspected screening-version schemas expose `projectionTechnology` with
STANDARD, IMAX, FOUR_DX and SCREEN_X, separately from `contentFormat` values 2D/3D.
Movie create/save version schemas default to STANDARD and 2D. Movie response requires
projectionTechnology; the inspected Inventory showtime-version schema has no required
list. These markers agree with the inspected DTOs/enums and current generated models.

This confirms the relevant schema is served locally. It does not identify the commit
of the running binaries: no runtime build revision was established. Do not label these
responses as exports from Backend HEAD or as a full contract/security audit. No mutation
or product-data request was performed during this check.

## Roadmap handoff and remaining work

A0.1 updated the source status and confirmed projection schemas in local runtime OpenAPI.

A0.2 ran `npm run api` using Orval 8.38.0 against all five configured local services.
All five reported success; generated content already matched HEAD, so no generated
source edits were needed. Static comparison found exact operation-ID/export matches:
Movie 19, User 7, Inventory 66, Booking 6 and Payment 5. No Notification paths were found.
The npm PowerShell wrapper emitted a prefix-path access warning, but Orval completed
with exit code 0. No dependencies were installed or changed.

Reviewed the screening-version and matrix request/response markers against Backend
DTOs/enums/controllers, plus Admin booking/payment lookup and Payment security.
Updated the API inventory and generation notes. Refreshed Movie/Inventory snapshots
with export timestamps, SHA-256, inspected source revision and explicit runtime limits.
The old Movie metadata placeholders and old Inventory export were replaced. The old
Inventory snapshot's sale-scopes/preview operations are absent from current runtime/source;
do not restore those endpoints based on the old snapshot.

Runtime build provenance remains unconfirmed: all five `/actuator/info` responses were
`{}`. Backend HEAD identifies inspected source, not the running binaries. The scoped
contract markers match source; this does not certify every DTO, permission or business
operation. See `docs/api/OPENAPI_GENERATION.md` and snapshot metadata for the review scope.
User/Booking/Payment were generated from live specs; no snapshots were added for them.

The A1.3 follow-up above fixes case-insensitive duplicate validation and missing error
messages. A1.1 generation and A1.2 matrix behavior already exist in source; their
presence does not imply browser verification. Next, audit A1.4 dependency resets and
compatibility against the actual room/version contract, then follow the roadmap order. Do not
reimplement the already-wired matrix/pricing/showtime/booking flows on the assumption
that the October status is current. Keep R28 Notification deferred.

## Verification and manual follow-up

Performed in A0.1:

- Read Git remotes, branches/status, local revisions and recent history.
- Read routes, feature components/queries/mappers, generated models, design guidance
  and relevant Backend controllers/DTOs/enums/security configuration without modifying Backend.
- Read the two local runtime OpenAPI documents and inspected the schema markers above.
- Reviewed the documentation diff and checked existing changed-file hashes for preservation.

Not performed: browser/manual interactions, responsive/accessibility checks, business
API mutations, Orval generation, tests, lint, type checking, build or formatting.
No historical automated or browser result was independently established by this audit.

Manual follow-up (pending, not results):

1. Establish runtime build provenance before claiming snapshots came from an exact BE
   commit. All five Orval inputs were reachable and generation completed in A0.2.
2. Exercise movie create/edit with multiple language variants, ID/version preservation,
   empty/duplicate rejection and immutable persisted definitions.
3. Save/reload matrix drafts with empty rows/columns and COUPLE seats; verify publication,
   copy, conflict/reload handling and unsaved-change guards.
4. Verify pricing draft/publish/cancel, zero/unpriced/not-applicable states and different
   COUPLE fares across ticket groups, time bands and 2D/3D.
5. Verify showtime dependency resets, compatibility errors and stored booking fares.
6. Check relevant screens at 390, 768, 1024 and 1440px before claiming visual completion.
