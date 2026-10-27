/* Buildless, offline, hash navigation. All business data is local demo data. */
'use strict'

;(() => {
  const D = window.CinemaData,
    KEY = 'lumiere-admin-v1',
    $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)]
  let db,
    storageError = false,
    loadNotice = ''
  try {
    const raw = localStorage.getItem(KEY)
    db = raw ? JSON.parse(raw) : D.seed()
    const lists = [
      'movies',
      'cinemas',
      'rooms',
      'shows',
      'pricing',
      'orders',
      'payments',
      'products',
      'promotions',
      'customers',
      'staff',
      'logs',
    ]
    if (
      db.version !== 1 ||
      !lists.every((k) => Array.isArray(db[k])) ||
      !db.settings ||
      !db.permissions
    ) {
      db = D.seed()
      loadNotice = 'Dữ liệu lưu trước đó không đúng định dạng. Đã mở dữ liệu mẫu an toàn.'
    }
  } catch (error) {
    db = D.seed()
    if (error instanceof SyntaxError) loadNotice = 'Dữ liệu lưu bị lỗi. Đã mở dữ liệu mẫu an toàn.'
    else storageError = true
  }
  const state = {
    scope: 'all',
    employee: 'E1',
    q: '',
    filter: {},
    page: 1,
    tab: '',
    view: 'list',
    selectedSeats: new Set(),
    check: null,
    rangeStart: D.day(-6),
    rangeEnd: D.day(),
    scheduleDate: D.day(),
    roomId: 'R1',
  }
  const menu = [
    ['TỔNG QUAN', [['dashboard', 'Tổng quan', 'grid']]],
    [
      'QUẢN LÝ RẠP',
      [
        ['movies', 'Phim', 'film'],
        ['cinemas', 'Cụm rạp', 'building'],
        ['rooms', 'Phòng & sơ đồ ghế', 'seat'],
        ['shows', 'Lịch chiếu', 'calendar'],
        ['pricing', 'Chính sách vé', 'ticket'],
      ],
    ],
    [
      'VẬN HÀNH',
      [
        ['orders', 'Đơn đặt vé', 'cart'],
        ['payments', 'Thanh toán', 'wallet'],
        ['checkin', 'Kiểm soát vé', 'scan'],
        ['products', 'Đồ ăn & combo', 'cup'],
        ['promotions', 'Khuyến mãi', 'tag'],
      ],
    ],
    [
      'HỆ THỐNG',
      [
        ['customers', 'Khách hàng', 'users'],
        ['staff', 'Nhân viên & quyền', 'shield'],
        ['reports', 'Báo cáo', 'chart'],
        ['settings', 'Cài đặt', 'settings'],
        ['logs', 'Nhật ký hoạt động', 'clock'],
      ],
    ],
  ]
  const titles = Object.fromEntries(menu.flatMap((g) => g[1].map((x) => [x[0], x[1]])))
  const desc = {
    dashboard: 'Một góc nhìn tổng thể về hoạt động kinh doanh của bạn.',
    movies: 'Quản lý nội dung phim và các phiên bản trình chiếu.',
    cinemas: 'Quản lý địa điểm, thông tin liên hệ và năng lực vận hành.',
    rooms: 'Cấu hình công nghệ phòng chiếu và từng vị trí đặt chỗ.',
    shows: 'Sắp xếp suất chiếu, kiểm tra phòng và điều kiện mở bán.',
    pricing: 'Giá bán cụ thể cho từng định dạng, hạng ghế và đối tượng.',
    orders: 'Theo dõi đơn hàng, vé và trạng thái sử dụng.',
    payments: 'Đối chiếu các giao dịch và xử lý trường hợp cần kiểm tra.',
    checkin: 'Tra cứu và xác nhận vé tại lối vào phòng chiếu.',
    products: 'Quản lý sản phẩm, combo và phạm vi bán tại các rạp.',
    promotions: 'Thiết lập ưu đãi và các điều kiện áp dụng rõ ràng.',
    customers: 'Tra cứu khách hàng và lịch sử đồng hành cùng Lumière.',
    staff: 'Tài khoản nhân viên, phạm vi phụ trách và quyền thao tác.',
    reports: 'Khám phá kết quả kinh doanh từ dữ liệu giao dịch.',
    settings: 'Thông tin thương hiệu và các thiết lập vận hành chung.',
    logs: 'Các thay đổi được ghi nhận trong không gian vận hành.',
  }
  const paths = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    film: 'M4 3h16v18H4z M8 3v18 M16 3v18 M4 7h4 M4 12h4 M4 17h4 M16 7h4 M16 12h4 M16 17h4',
    building: 'M3 21h18 M5 21V6l7-3 7 3v15 M9 8h1 M14 8h1 M9 12h1 M14 12h1 M10 21v-5h4v5',
    seat: 'M6 13V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8 M4 11v7h16v-7 M3 11h4v6 M17 17v-6h4 M6 18v3 M18 18v3',
    calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2',
    ticket: 'M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z M15 7v3 M15 13v2 M15 18v1',
    cart: 'M2 3h3l3 13h11l3-9H6 M9 21h.01 M18 21h.01',
    wallet: 'M3 5h17v15H3z M3 5V3h14 M15 11h6v5h-6z',
    scan: 'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6 M7 7h3v3H7z M14 7h3v3h-3z M7 14h3v3H7z M14 14h3v3h-3z',
    cup: 'M5 8h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z M16 9h2a3 3 0 0 1 0 6h-2 M8 2v3 M12 2v3',
    tag: 'M3 3h8l10 10-8 8L3 11z M7 7h.01',
    users:
      'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 3a4 4 0 0 1 0 7 M22 21v-3a4 4 0 0 0-3-4',
    shield: 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',
    chart: 'M3 3v18h18 M7 16v-4 M12 16V7 M17 16V3',
    settings: 'M9 3h6l1 4 4 1v6l-4 1-1 6H9l-1-6-4-1V8l4-1z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v6l4 2',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
    plus: 'M12 5v14 M5 12h14',
    chevron: 'M9 5l7 7-7 7',
    arrow: 'M4 12h16 M14 6l6 6-6 6',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
    close: 'M6 6l12 12 M6 18L18 6',
    edit: 'M4 16l11-11 4 4L8 20H4z M14 6l4 4',
    check: 'M4 12l5 5L20 6',
    alert: 'M12 3L2 21h20z M12 9v5 M12 18h.01',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    copy: 'M8 8h13v13H8z M16 8V3H3v13h5',
    refresh: 'M20 6v5h-5 M4 18v-5h5 M19 11a7 7 0 0 0-12-6L4 8 M5 13a7 7 0 0 0 12 6l3-3',
  }
  const icon = (n) =>
    `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n] || paths.grid}"/></svg>`
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    )
  const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'
  const num = (n) => Number(n || 0).toLocaleString('vi-VN')
  const date = (s) =>
    s
      ? new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date(s.length === 10 ? s + 'T12:00:00+07:00' : s))
      : '—'
  const stamp = (s) =>
    s
      ? new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        }).format(new Date(s))
      : '—'
  const get = (t, id) => db[t].find((x) => x.id === id)
  const employee = () => get('staff', state.employee) || db.staff[0]
  const role = () => employee().role
  const allowedCinemas = () =>
    role() === 'Quản trị hệ thống' ? db.cinemas.map((c) => c.id) : employee().cinemaIds
  const inScope = (id) =>
    allowedCinemas().includes(id) && (state.scope === 'all' || state.scope === id)
  const scopeLabel = () =>
    state.scope === 'all'
      ? role() === 'Quản trị hệ thống'
        ? 'Toàn hệ thống'
        : 'Các cụm rạp được phân công'
      : get('cinemas', state.scope)?.name
  const showCinema = (s) => get('rooms', s.roomId)?.cinemaId
  const scopedShows = () => db.shows.filter((s) => inScope(showCinema(s)))
  const scopedOrders = () => db.orders.filter((o) => inScope(showCinema(get('shows', o.showId))))
  const paid = (o) =>
    db.payments.some((p) => p.orderId === o.id && p.status === 'Thành công') &&
    o.status === 'Đã xác nhận'
  const status = (s) =>
    `<span class="badge ${['Hoạt động', 'Đang chiếu', 'Đang bán', 'Đang áp dụng', 'Mở bán', 'Đã xác nhận', 'Thành công', 'Hợp lệ', 'Đã sử dụng'].includes(s) ? 'green' : ['Chờ thanh toán', 'Bảo trì', 'Cần kiểm tra', 'Chưa sử dụng'].includes(s) ? 'orange' : ['Ngừng hoạt động', 'Thất bại', 'Đã hủy', 'Hết hạn', 'Tạm khóa'].includes(s) ? 'red' : ['Sắp chiếu', 'Sắp diễn ra'].includes(s) ? 'blue' : ''}">${esc(s)}</span>`
  const cap = (r) => r.seats.reduce((a, s) => a + (D.seatTypes[s.type]?.capacity || 0), 0),
    units = (r) => r.seats.filter((s) => D.seatTypes[s.type]?.capacity > 0).length
  const timeMinutes = (t) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1])
  const clock = (m) =>
    `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}${m >= 1440 ? ' (+1 ngày)' : ''}`
  const endTime = (s) => clock(timeMinutes(s.time) + get('movies', s.movieId).duration)
  const activeTickets = (s) =>
    db.orders
      .filter((o) => o.showId === s.id && paid(o))
      .flatMap((o) => o.tickets.filter((t) => t.status !== 'Đã hủy'))
  function permissions(r = role()) {
    const all = Object.keys(titles)
    let base = {}
    all.forEach(
      (k) =>
        (base[k] = {
          view: r !== 'Nhân viên soát vé' || ['dashboard', 'shows', 'checkin'].includes(k),
          create:
            r === 'Quản trị hệ thống' ||
            (r === 'Quản lý rạp' &&
              ['movies', 'rooms', 'shows', 'pricing', 'products', 'promotions'].includes(k)),
          edit:
            r === 'Quản trị hệ thống' ||
            (r === 'Quản lý rạp' && !['staff', 'settings'].includes(k)),
          operate:
            r === 'Quản trị hệ thống' ||
            r === 'Quản lý rạp' ||
            (r === 'Nhân viên bán vé' && ['orders', 'payments'].includes(k)) ||
            (r === 'Nhân viên soát vé' && k === 'checkin'),
        }),
    )
    if (r === 'Nhân viên bán vé')
      all
        .filter((k) => ['staff', 'settings', 'logs'].includes(k))
        .forEach((k) => (base[k].view = false))
    return {
      ...base,
      ...db.permissions[r],
    }
  }
  const can = (a, page = current()) => permissions()[page]?.[a] === true
  const current = () => location.hash.slice(1).split('/')[0] || 'dashboard'
  function toast(message, error = false) {
    const el = document.createElement('div')
    el.className = 'toast' + (error ? ' error' : '')
    el.textContent = message
    $('#toasts').append(el)
    setTimeout(() => el.remove(), 5000)
  }
  function persist(action, target) {
    db.logs.unshift({
      id: 'L' + Date.now(),
      actor: employee().name,
      action,
      target,
      at: new Date().toISOString(),
    })
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
      storageError = false
      loadNotice = ''
      return true
    } catch {
      storageError = true
      toast('Không lưu được trên trình duyệt. Thay đổi hiện chỉ còn trong phiên này.', true)
      return false
    }
  }
  function guard(action, page = current()) {
    if (!can(action, page)) {
      toast('Vai trò hiện tại không có quyền thực hiện thao tác này.', true)
      return false
    }
    return true
  }
  function opt(values, value) {
    return values
      .map((x) => {
        const v = typeof x === 'string' ? x : x[0],
          l = typeof x === 'string' ? x : x[1]
        return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`
      })
      .join('')
  }
  function field(name, label, value = '', type = 'text', extra = '', full = false) {
    return `<label class="field ${full ? 'full' : ''}">${label}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`
  }
  function select(name, label, values, value, full = false) {
    return `<label class="field ${full ? 'full' : ''}">${label}<select name="${name}">${opt(values, value)}</select></label>`
  }
  function textArea(name, label, value = '', full = true) {
    return `<label class="field ${full ? 'full' : ''}">${label}<textarea name="${name}">${esc(value)}</textarea></label>`
  }
  function checks(name, label, values, selected = []) {
    return `<div class="field full"><span>${label}</span><div class="checkbox-row">${values
      .map((x) => {
        const v = typeof x === 'string' ? x : x[0],
          l = typeof x === 'string' ? x : x[1]
        return `<label class="check-field"><input name="${name}" type="checkbox" value="${esc(v)}" ${selected.includes(v) ? 'checked' : ''}>${esc(l)}</label>`
      })
      .join('')}</div></div>`
  }
  function button(label, action, id = '', kind = '', ic = '') {
    const names = {
      detail: 'Xem chi tiết',
      edit: 'Chỉnh sửa',
      close: 'Đóng',
      sidebar: 'Thu gọn hoặc mở điều hướng',
      notifications: 'Thông báo vận hành',
      'copy-show': 'Sao chép suất chiếu',
      'remove-version': 'Xóa phiên bản',
      'remove-component': 'Xóa thành phần',
    }
    return `<button type="button" class="${kind}" ${!label ? `aria-label="${names[action] || action}" title="${names[action] || action}"` : ''} data-action="${action}" data-id="${esc(id)}">${ic ? icon(ic) : ''}${label}</button>`
  }
  function detailField(label, value, full = false) {
    return `<div class="detail-field ${full ? 'full' : ''}"><dt>${label}</dt><dd>${value}</dd></div>`
  }
  function empty(
    label = 'Không có dữ liệu phù hợp',
    hint = 'Thử thay đổi bộ lọc hoặc phạm vi cụm rạp.',
  ) {
    return `<div class="empty">${icon('search')}<h3>${label}</h3><p>${hint}</p></div>`
  }
  function showDialog(title, body, foot = '', wide = false) {
    const d = $('#dialog')
    d.className = wide ? 'wide' : ''
    d.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2>${button('', 'close', '', 'icon-btn ghost', 'close')}</div><div class="dialog-body">${body}</div>${foot ? `<div class="dialog-foot">${foot}</div>` : ''}`
    if (!d.open) d.showModal()
  }
  function closeDialog() {
    $('#dialog').close()
    wizard = null
  }
  function formDialog(
    title,
    body,
    submitLabel = 'Lưu thay đổi',
    wide = false,
    formId = 'entity-form',
  ) {
    showDialog(
      title,
      `<form id="${formId}"><div id="form-errors" role="alert"></div><div class="form-grid">${body}</div><button type="submit" hidden></button></form>`,
      `${button('Hủy', 'close')}<button type="submit" form="${formId}" class="primary">${submitLabel}</button>`,
      wide,
    )
  }
  function formError(s) {
    $('#form-errors').innerHTML = `<div class="form-error">${esc(s)}</div>`
    $('#form-errors').scrollIntoView({
      block: 'nearest',
    })
  }
  function route(reset = true) {
    if (reset) {
      state.q = ''
      state.filter = {}
      state.page = 1
      state.tab = ''
      state.check = null
    }
    document.body.classList.remove('mobile-open')
    drawChrome()
    render()
  }
  function drawChrome() {
    document.title = db.settings.brand + ' — Quản trị rạp chiếu phim'
    if ($('#footer-brand')) $('#footer-brand').textContent = db.settings.brand
    const page = current()
    $('#sidebar').innerHTML =
      `<a class="brand" href="#dashboard"><div class="brand-mark"><img src="${esc(db.settings.logo)}" width="34" height="37" alt=""></div><div class="brand-name">${esc(db.settings.brand.replace(/ Cinema$/i, ''))}<small>QUẢN TRỊ RẠP CHIẾU</small></div></a><nav class="nav-list">${menu.map((g) => `<div class="nav-group">${g[0]}</div>${g[1].map(([id, label, ic]) => (can('view', id) ? `<a href="#${id}" class="nav-link ${page === id ? 'active' : ''}" ${page === id ? 'aria-current="page"' : ''} title="${label}">${icon(ic)}<span class="nav-label">${label}</span>${id === 'orders' ? `<span class="nav-count">${scopedOrders().filter((o) => o.status === 'Chờ thanh toán').length}</span>` : ''}</a>` : '')).join('')}`).join('')}</nav><div class="sidebar-bottom"><span class="live-dot"></span><div>Không gian quản trị<br><span style="color:#627185">Phiên bản minh họa 1.0</span></div></div>`
    $('#topbar').innerHTML =
      `${button('', 'sidebar', '', 'icon-btn ghost', 'menu')}<div class="top-scope">${icon('building')}<span class="top-label">Phạm vi</span><select id="scope" aria-label="Phạm vi cụm rạp">${opt([['all', role() === 'Quản trị hệ thống' ? 'Tất cả cụm rạp' : 'Cụm rạp phụ trách'], ...db.cinemas.filter((c) => allowedCinemas().includes(c.id)).map((c) => [c.id, c.name.replace('Lumière ', '')])], state.scope)}</select></div><div class="top-spacer"></div><span class="demo-pill">Dữ liệu minh họa</span>${button('', 'notifications', '', 'icon-btn ghost', 'bell')}<div class="account"><div class="avatar">${esc(
        employee()
          .name.split(' ')
          .slice(-2)
          .map((n) => n[0])
          .join(''),
      )}</div><div><strong>${esc(employee().name)}</strong><select id="employee" aria-label="Mô phỏng tài khoản">${opt(
        db.staff
          .filter((e) => e.status === 'Hoạt động')
          .map((e) => [e.id, e.name + ' · ' + e.role]),
        state.employee,
      )}</select></div></div>`
  }
  function header(page, action = '') {
    const group = menu.find((g) => g[1].some((x) => x[0] === page))
    return `<div class="breadcrumb">Không gian quản trị ${icon('chevron')} ${group?.[0].toLowerCase() || ''} ${icon('chevron')} <b>${titles[page] || 'Trang không tồn tại'}</b></div><div class="page-head"><div>${page === 'dashboard' ? '<div class="eyebrow">TRUNG TÂM ĐIỀU HÀNH</div>' : ''}<h1>${page === 'dashboard' ? 'Tổng quan hoạt động' : titles[page] || 'Không tìm thấy'}</h1><p class="subtitle">${desc[page] || 'Kiểm tra lại đường dẫn điều hướng.'}</p></div><div class="head-actions">${action}</div></div>`
  }
  function createAction(label, action = 'new') {
    return can('create') ? button(label, action, '', 'primary', 'plus') : ''
  }
  function render() {
    $('#main').setAttribute('aria-busy', 'false')
    const page = current()
    const views = {
      dashboard,
      movies,
      cinemas,
      rooms,
      shows,
      pricing,
      orders,
      payments,
      checkin,
      products,
      promotions,
      customers,
      staff,
      reports,
      settings,
      logs,
    }
    if (!views[page]) {
      $('#main').innerHTML =
        header(page) + empty('Không tìm thấy trang', 'Chọn một mục trong thanh điều hướng.')
      return
    }
    if (!can('view')) {
      $('#main').innerHTML =
        header(page) +
        empty(
          'Truy cập bị giới hạn',
          'Chọn tài khoản khác trên thanh trên cùng để trải nghiệm vai trò.',
        )
      return
    }
    $('#main').innerHTML =
      (loadNotice ? `<div class="notice error">${esc(loadNotice)}</div>` : '') +
      (storageError
        ? '<div class="notice error">Không truy cập được bộ nhớ trình duyệt. Dữ liệu chỉ được giữ trong phiên hiện tại.</div>'
        : '') +
      views[page]()
  }
  function filterBar(extra = []) {
    return `<div class="filter-row"><label class="search">${icon('search')}<input id="search" aria-label="Tìm kiếm" placeholder="Tìm kiếm…" value="${esc(state.q)}"></label>${extra.map(([key, label, values]) => `<select data-filter="${key}" aria-label="${label}">${opt([['', label], ...values.map((x) => (typeof x === 'string' ? x : x))], state.filter[key] || '')}</select>`).join('')}${state.q || Object.values(state.filter).some(Boolean) ? button('Xóa lọc', 'clear', '', 'small') : ''}</div>`
  }
  function filtered(rows, getText, filters = {}) {
    const q = state.q.toLocaleLowerCase('vi')
    return rows.filter(
      (x) =>
        (!q || getText(x).toLocaleLowerCase('vi').includes(q)) &&
        Object.entries(filters).every(
          ([key, f]) => !state.filter[key] || f(x) === state.filter[key],
        ),
    )
  }
  function table(headers, rows, rowFn, extra = [], noPage = false) {
    const count = rows.length
    const pages = Math.max(1, Math.ceil(count / 8))
    state.page = Math.min(state.page, pages)
    const visible = noPage ? rows : rows.slice((state.page - 1) * 8, state.page * 8)
    return `<div class="card">${extra === null ? '' : filterBar(extra)}${count ? `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${visible.map(rowFn).join('')}</tbody></table></div>` : empty()}${!noPage ? `<div class="pagination"><span>${count ? 'Hiển thị ' + ((state.page - 1) * 8 + 1) + '–' + Math.min(state.page * 8, count) + ' trong ' + count + ' kết quả' : '0 kết quả'}</span><div class="pages"><button data-action="page" data-id="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="Trang trước">‹</button><span class="chip">${state.page} / ${pages}</span><button data-action="page" data-id="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="Trang sau">›</button></div></div>` : ''}</div>`
  }
  function rowActions(id, edit = true) {
    return `<div class="action-row">${button('', 'detail', id, 'icon-btn ghost', 'eye')}${edit && can('edit') ? button('', 'edit', id, 'icon-btn ghost', 'edit') : ''}</div>`
  }
  function periodFilters(extra = '') {
    return `<div class="filters"><label>Từ ngày<input id="range-start" type="date" value="${state.rangeStart}"></label><label>Đến ngày<input id="range-end" type="date" value="${state.rangeEnd}"></label>${extra}<span class="subtle-total" style="margin:0 0 9px 4px">${esc(scopeLabel())} · Asia/Ho_Chi_Minh</span></div>`
  }
  function metrics(start = state.rangeStart, end = state.rangeEnd) {
    const os = scopedOrders().filter(
      (o) => o.createdAt.slice(0, 10) >= start && o.createdAt.slice(0, 10) <= end,
    )
    const pos = os.filter(paid)
    const ss = scopedShows().filter(
      (s) => s.date >= start && s.date <= end && s.status !== 'Đã hủy',
    )
    const tickets = pos.flatMap((o) => o.tickets.filter((t) => t.status !== 'Đã hủy'))
    const seats = tickets.reduce((a, t) => a + D.seatTypes[t.type].capacity, 0)
    const capacity = ss.reduce((a, s) => a + cap(get('rooms', s.roomId)), 0)
    return {
      orders: os,
      paid: pos,
      shows: ss,
      revenue: pos.reduce((a, o) => a + o.total, 0),
      tickets: tickets.length,
      seats,
      capacity,
      occupancy: capacity ? (seats / capacity) * 100 : 0,
      food: pos.reduce((a, o) => a + o.items.reduce((v, i) => v + i.unitPrice * i.qty, 0), 0),
    }
  }
  function statsHTML(m) {
    const days = Math.max(
        1,
        Math.round((new Date(state.rangeEnd) - new Date(state.rangeStart)) / 86400000) + 1,
      ),
      before = new Date(state.rangeStart + 'T12:00:00+07:00')
    before.setDate(before.getDate() - 1)
    const prevEnd = before.toISOString().slice(0, 10)
    before.setDate(before.getDate() - days + 1)
    const prev = metrics(before.toISOString().slice(0, 10), prevEnd)
    const cells = [
      ['Doanh thu thực thu', money(m.revenue), 'wallet', m.revenue, prev.revenue],
      ['Vé đã bán', num(m.tickets) + '<small>đơn vị</small>', 'ticket', m.tickets, prev.tickets],
      [
        'Đơn đặt vé',
        num(m.orders.length) + '<small>đơn</small>',
        'cart',
        m.orders.length,
        prev.orders.length,
      ],
      [
        'Tỷ lệ lấp đầy',
        m.occupancy.toFixed(1) + '<small>%</small>',
        'seat',
        m.occupancy,
        prev.occupancy,
      ],
    ]
    return `<div class="stats">${cells.map(([label, value, ic, v, p]) => `<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon(ic)}</span></div><div class="stat-value">${value}</div><div class="stat-foot"><span class="trend ${v < p ? 'down' : ''}">${p ? `${v >= p ? '↑' : '↓'} ${Math.abs(((v - p) / p) * 100).toFixed(1)}%` : '—'}</span>${p ? 'so với ' + days + ' ngày trước' : 'Kỳ trước chưa có dữ liệu'}</div></div>`).join('')}</div>`
  }
  function chart(m) {
    const start = new Date(state.rangeStart + 'T12:00:00+07:00'),
      n = Math.min(
        62,
        Math.round((new Date(state.rangeEnd) - new Date(state.rangeStart)) / 86400000) + 1,
      )
    if (n < 1) return empty('Khoảng ngày không hợp lệ')
    const a = []
    for (let i = 0; i < n; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const key = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)
      a.push({
        key,
        total: m.paid
          .filter((o) => o.createdAt.slice(0, 10) === key)
          .reduce((s, o) => s + o.total, 0),
      })
    }
    const max = Math.max(100000, ...a.map((x) => x.total)) * 1.2,
      pts = a.map((x, i) => [55 + (i * 650) / Math.max(1, n - 1), 180 - (x.total / max) * 155])
    return `<svg class="chart" role="img" aria-label="Biểu đồ doanh thu từng ngày; số liệu chi tiết có tại Báo cáo" viewBox="0 0 740 225"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ed936b" stop-opacity=".22"/><stop offset="1" stop-color="#ed936b" stop-opacity="0"/></linearGradient></defs>${[0, 1, 2, 3].map((i) => `<path d="M55 ${25 + i * 52}h650" stroke="#edf0f3" stroke-dasharray="3 4"/><text x="44" y="${29 + i * 52}" text-anchor="end" class="chart-axis">${((max * (3 - i)) / 3 / 1000000).toFixed(1)}tr</text>`).join('')}<path d="M${pts.map((p) => p.join(',')).join(' L')} L705 181 L55 181Z" fill="url(#chartFill)"/><polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#e98358" stroke-width="2.5"/>${a.map((x, i) => `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="3.5" fill="#e98358" stroke="white" stroke-width="2"><title>${date(x.key)}: ${money(x.total)}</title></circle>${i % Math.max(1, Math.ceil(n / 8)) === 0 ? `<text x="${pts[i][0]}" y="210" text-anchor="middle" class="chart-axis">${x.key.slice(8)}/${x.key.slice(5, 7)}</text>` : ''}`).join('')}</svg>${n === 62 ? '<div class="card-note">Biểu đồ hiển thị tối đa 62 ngày đầu; bảng báo cáo vẫn tính toàn kỳ.</div>' : ''}`
  }
  function warnings() {
    const a = []
    db.rooms
      .filter((r) => inScope(r.cinemaId) && r.status === 'Bảo trì')
      .forEach((r) =>
        a.push({
          title: r.name + ' đang bảo trì',
          sub: get('cinemas', r.cinemaId).name,
          href: '#rooms',
        }),
      )
    db.pricing
      .filter((p) => p.cinemaIds.some(inScope) && Object.values(p.prices).some((v) => v === ''))
      .forEach((p) =>
        a.push({
          title: 'Bảng giá chưa hoàn chỉnh',
          sub: p.name + ' · Còn tổ hợp chưa nhập giá',
          href: '#pricing',
        }),
      )
    db.payments
      .filter((p) => p.needsReview && scopedOrders().some((o) => o.id === p.orderId))
      .forEach((p) =>
        a.push({
          title: 'Giao dịch cần đối chiếu',
          sub: p.id + ' · Thành công, cần kiểm tra đơn',
          href: '#payments',
        }),
      )
    return a
  }
  function dashboard() {
    const m = metrics(),
      ranking = db.movies
        .map((movie) => ({
          movie,
          value: m.paid
            .filter((o) => get('shows', o.showId).movieId === movie.id)
            .reduce((a, o) => a + o.total, 0),
          count: m.paid
            .filter((o) => get('shows', o.showId).movieId === movie.id)
            .reduce((a, o) => a + o.tickets.length, 0),
        }))
        .filter((x) => x.value)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
    const now = new Date(),
      upcoming = scopedShows()
        .filter(
          (s) => new Date(s.date + 'T' + s.time + ':00+07:00') >= now && s.status === 'Mở bán',
        )
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 5)
    const max = Math.max(
      1,
      ...db.cinemas.map((c) =>
        m.paid
          .filter((o) => showCinema(get('shows', o.showId)) === c.id)
          .reduce((a, o) => a + o.total, 0),
      ),
    )
    return (
      header('dashboard', button('Xuất báo cáo', 'export', '', '', 'download')) +
      periodFilters() +
      statsHTML(m) +
      `<div class="grid-main"><section class="card"><div class="card-head"><div><h2>Doanh thu theo thời gian</h2><p class="subtitle">${date(state.rangeStart)} – ${date(state.rangeEnd)}</p></div><span class="legend"><span><i></i>Doanh thu thực thu</span></span></div><div class="card-body">${chart(m)}</div></section><section class="card"><div class="card-head"><h2>Hiệu quả cụm rạp</h2><span class="chip">${db.cinemas.filter((c) => inScope(c.id)).length} cụm</span></div><div style="padding:8px 0 12px">${db.cinemas
        .filter((c) => inScope(c.id))
        .map((c) => {
          const os = m.paid.filter((o) => showCinema(get('shows', o.showId)) === c.id),
            value = os.reduce((a, o) => a + o.total, 0)
          return `<div class="cinema-performance"><div class="performance-line"><span>${esc(c.name.replace('Lumière ', ''))}</span><b>${money(value)}</b></div><div class="progress"><i style="width:${(value / max) * 100}%"></i></div><p class="performance-sub">${num(os.reduce((a, o) => a + o.tickets.length, 0))} vé đã bán · ${esc(c.city)}</p></div>`
        })
        .join(
          '',
        )}</div></section></div><div class="grid-half"><section class="card"><div class="card-head"><h2>Phim nổi bật</h2><a class="text-link" href="#reports">Xem báo cáo →</a></div><div class="table-wrap"><table><thead><tr><th>Phim</th><th>Vé bán</th><th>Doanh thu đơn</th></tr></thead><tbody>${ranking.map((x, i) => `<tr><td><div class="row-title"><span class="muted">0${i + 1}</span><img class="poster" src="${x.movie.poster}" alt=""><span><b class="cell-main">${esc(x.movie.name)}</b><small class="cell-sub">${esc(x.movie.genre)} · ${x.movie.duration} phút</small></span></div></td><td>${num(x.count)}</td><td class="money">${money(x.value)}</td></tr>`).join('')}</tbody></table>${!ranking.length ? empty() : ''}</div></section><section class="card"><div class="card-head"><h2>Cần chú ý</h2><span class="badge orange">${warnings().length} thông báo</span></div><div class="card-body">${
        warnings()
          .map(
            (w) =>
              `<a class="alert-line" href="${w.href}"><div class="alert-symbol">${icon('alert')}</div><div><p>${esc(w.title)}</p><small>${esc(w.sub)}</small></div><span style="margin-left:auto;color:#aab4be">${icon('chevron')}</span></a>`,
          )
          .join('') || '<p class="muted">Không có cảnh báo trong phạm vi này.</p>'
      }</div></section></div><section class="card"><div class="card-head"><h2>Suất chiếu sắp bắt đầu</h2><a class="text-link" href="#shows">Tất cả lịch chiếu →</a></div><div class="table-wrap"><table><thead><tr><th>Phim / phiên bản</th><th>Cụm rạp / phòng</th><th>Thời gian</th><th>Đã bán / đơn vị</th><th>Trạng thái</th></tr></thead><tbody>${upcoming
        .map((s) => {
          const movie = get('movies', s.movieId),
            room = get('rooms', s.roomId),
            v = movie.versions.find((v) => v.id === s.versionId)
          return `<tr><td><div class="row-title"><img class="poster" src="${movie.poster}" alt=""><span class="cell-main">${esc(movie.name)}<small class="cell-sub">${v.format} · ${esc(v.subtitle)}</small></span></div></td><td>${esc(get('cinemas', room.cinemaId).name.replace('Lumière ', ''))}<span class="cell-sub">${esc(room.name)} · ${esc(room.kind)}</span></td><td><b>${s.time}</b><span class="cell-sub">${date(s.date)}</span></td><td>${activeTickets(s).length} / ${units(room)}<div class="progress" style="margin-top:6px;width:90px"><i style="width:${(activeTickets(s).length / units(room)) * 100}%"></i></div></td><td>${status(s.status)}</td></tr>`
        })
        .join(
          '',
        )}</tbody></table>${!upcoming.length ? empty('Không còn suất chiếu sắp tới') : ''}</div></section><p class="metric-note mt">Doanh thu: đơn đã xác nhận và thanh toán thành công, sau giảm giá, gồm đồ ăn. Vé bán tính theo đơn vị đặt chỗ; lấp đầy tính theo số chỗ của vé / tổng sức chứa các suất trong kỳ. Kỳ lọc tính theo ngày tạo đơn; sức chứa tính theo ngày chiếu.</p>`
    )
  }
  function movies() {
    const rows = filtered(db.movies, (m) => m.name + ' ' + m.director, {
      status: (m) => m.status,
      genre: (m) => m.genre,
      age: (m) => m.age,
    })
    return (
      header('movies', createAction('Thêm phim')) +
      table(
        ['Phim', 'Thời lượng', 'Phiên bản', 'Khởi chiếu', 'Trạng thái', ''],
        rows,
        (m) =>
          `<tr><td><div class="row-title"><img class="poster" src="${esc(m.poster)}" alt=""><span><span class="cell-main">${esc(m.name)}</span><span class="cell-sub">${esc(m.genre)} · ${m.age} · ${esc(m.country)}</span></span></div></td><td>${m.duration} phút</td><td>${m.versions.map((v) => `<span class="chip">${v.format} · ${esc(v.subtitle)}</span>`).join('')}</td><td>${date(m.release)}</td><td>${status(m.status)}</td><td>${rowActions(m.id)}</td></tr>`,
        [
          ['status', 'Tất cả trạng thái', ['Đang chiếu', 'Sắp chiếu', 'Ngừng chiếu']],
          ['genre', 'Tất cả thể loại', [...new Set(db.movies.map((m) => m.genre))]],
          ['age', 'Phân loại độ tuổi', ['P', 'K', 'T13', 'T16', 'T18']],
        ],
      )
    )
  }
  function cinemas() {
    const rows = filtered(
      db.cinemas.filter((c) => inScope(c.id)),
      (c) => c.name + ' ' + c.city,
      {
        status: (c) => c.status,
      },
    )
    return (
      header('cinemas', createAction('Thêm cụm rạp')) +
      `<div class="notice info">${icon('building')}Cụm rạp là một địa điểm vận hành. Mỗi cụm có các phòng chiếu và sơ đồ ghế riêng.</div><div class="card mb">${filterBar([['status', 'Tất cả trạng thái', ['Hoạt động', 'Ngừng hoạt động']]])}</div><div class="cinema-cards">${rows
        .map((c, i) => {
          const rs = db.rooms.filter((r) => r.cinemaId === c.id)
          return `<article class="card"><div class="cinema-cover" style="background-image:url('${esc(c.image)}');background-size:cover">${status(c.status)}<span class="cover-text">${esc(c.city)}</span></div><div class="card-body"><h2>${esc(c.name)}</h2><p class="subtitle">${esc(c.address)}</p><div class="cinema-meta"><span><strong>${rs.length}</strong>Phòng chiếu</span><span><strong>${num(rs.reduce((a, r) => a + cap(r), 0))}</strong>Chỗ ngồi</span><span><strong>${rs.filter((r) => r.status === 'Hoạt động').length}</strong>Đang hoạt động</span></div><p class="muted" style="font-size:11px">${esc(c.phone)} · ${esc(c.hours)}</p><div class="action-row mt">${button('Chi tiết rạp', 'detail', c.id, 'small')}${can('edit') ? button('Chỉnh sửa', 'edit', c.id, 'small ghost') : ''}</div></div></article>`
        })
        .join('')}</div>${!rows.length ? empty() : ''}`
    )
  }
  function rooms() {
    const rs = db.rooms.filter((r) => inScope(r.cinemaId))
    let room = rs.find((r) => r.id === state.roomId) || rs[0]
    if (room) state.roomId = room.id
    return (
      header('rooms', createAction('Thêm phòng chiếu')) +
      `<div class="card mb"><div class="tabs">${button('Danh sách phòng', 'tab', 'list', !state.tab || state.tab === 'list' ? 'active' : '')}${button('Sơ đồ ghế', 'tab', 'seats', state.tab === 'seats' ? 'active' : '')}</div></div>` +
      (state.tab === 'seats'
        ? room
          ? seatEditor(room)
          : empty()
        : table(
            ['Phòng chiếu', 'Cụm rạp', 'Định dạng', 'Sức chứa', 'Trạng thái', ''],
            filtered(rs, (r) => r.name + ' ' + r.kind + ' ' + get('cinemas', r.cinemaId).name, {
              status: (r) => r.status,
              kind: (r) => r.kind,
            }),
            (r) =>
              `<tr><td><b>${esc(r.name)}</b><span class="cell-sub">${esc(r.kind)}</span></td><td>${esc(get('cinemas', r.cinemaId).name.replace('Lumière ', ''))}</td><td>${r.formats.map((f) => `<span class="chip">${f}</span>`).join('')}</td><td>${cap(r)} chỗ<span class="cell-sub">${units(r)} đơn vị đặt chỗ</span></td><td>${status(r.status)}</td><td><div class="action-row">${button('Sơ đồ', 'seats', r.id, 'small')}${rowActions(r.id)}</div></td></tr>`,
            [
              ['status', 'Tất cả trạng thái', ['Hoạt động', 'Bảo trì', 'Ngừng hoạt động']],
              ['kind', 'Tất cả loại phòng', [...new Set(db.rooms.map((r) => r.kind))]],
            ],
          ))
    )
  }
  function seatEditor(r) {
    const selected = state.selectedSeats
    return `<div class="card"><div class="card-head"><div><h2>Sơ đồ ${esc(r.name)}</h2><p class="subtitle">${esc(get('cinemas', r.cinemaId).name)} · ${cap(r)} chỗ / ${units(r)} đơn vị đặt chỗ</p></div><select id="seat-room" aria-label="Chọn phòng" style="padding:8px;max-width:280px">${opt(
      db.rooms
        .filter((r) => inScope(r.cinemaId))
        .map((r) => [
          r.id,
          get('cinemas', r.cinemaId).name.replace('Lumière ', '') + ' · ' + r.name,
        ]),
      r.id,
    )}</select></div><div class="card-body"><div class="notice info">Chọn nhiều vị trí để đổi hạng hoặc tạo lối đi. Ghế đôi: 2 chỗ / 1 đơn vị; giường: 2 chỗ / 1 đơn vị.</div>${db.shows.some((s) => s.roomId === r.id && s.status === 'Mở bán') ? `<div class="notice">${icon('alert')}Phòng có suất đang mở bán. Không thể thay đổi sơ đồ cho đến khi đóng các suất; sơ đồ có vé đã bán được khóa để bảo toàn dữ liệu.</div>` : ''}<div class="seat-stage"><div class="screen">MÀN HÌNH</div>${[
      ...new Set(r.seats.map((s) => s.row)),
    ]
      .map(
        (row) =>
          `<div class="seat-row"><span class="row-label">${row}</span>${r.seats
            .filter((s) => s.row === row)
            .map(
              (s) =>
                `<button class="seat ${s.type} ${selected.has(s.id) ? 'chosen' : ''}" data-action="seat" data-id="${s.id}" aria-pressed="${selected.has(s.id)}" aria-label="${s.id}, ${D.seatTypes[s.type].label}">${s.type === 'AISLE' ? '·' : s.col}</button>`,
            )
            .join('')}<span class="row-label">${row}</span></div>`,
      )
      .join('')}</div><div class="seat-legend">${Object.entries(D.seatTypes)
      .map(
        ([k, v]) =>
          `<span><i style="background:${
            {
              VIP: '#f9ddc9',
              DOUBLE: '#dfd2ef',
              RECLINER: '#bedbd5',
              BED: '#cfd1ef',
              BLOCKED: '#d8dadd',
              AISLE: '#fff',
            }[k] || '#e7edf1'
          }"></i>${v.label}</span>`,
      )
      .join(
        '',
      )}</div></div><div class="seat-toolbar"><b>${selected.size} vị trí đã chọn</b><select id="seat-type" aria-label="Hạng ghế mới">${opt(
      Object.entries(D.seatTypes).map(([k, v]) => [k, v.label]),
      'VIP',
    )}</select>${can('edit') ? button('Áp dụng hạng ghế', 'apply-seats', '', '', 'check') : status('Chỉ xem')}${button('Bỏ chọn', 'clear-seats', '', 'small ghost')}${button('Chọn cả hàng', 'select-row', '', 'small ghost')}</div></div>`
  }
  function shows() {
    const filteredShows = filtered(
      scopedShows(),
      (s) => get('movies', s.movieId).name + ' ' + get('rooms', s.roomId).name,
      {
        movie: (s) => s.movieId,
        room: (s) => s.roomId,
        format: (s) => get('movies', s.movieId).versions.find((v) => v.id === s.versionId).format,
        status: (s) => s.status,
      },
    )
      .filter((s) => !state.filter.date || s.date === state.filter.date)
      .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time))
    const extra = [
      ['movie', 'Tất cả phim', db.movies.map((m) => [m.id, m.name])],
      [
        'room',
        'Tất cả phòng',
        db.rooms
          .filter((r) => inScope(r.cinemaId))
          .map((r) => [
            r.id,
            get('cinemas', r.cinemaId).name.replace('Lumière ', '') + ' · ' + r.name,
          ]),
      ],
      ['format', 'Định dạng', ['2D', '3D']],
      ['status', 'Trạng thái', ['Mở bán', 'Đóng bán', 'Đã hủy']],
    ]
    return (
      header('shows', createAction('Tạo suất chiếu')) +
      `<div class="filters"><label>Ngày chiếu<input type="date" id="show-date" value="${esc(state.filter.date || '')}"></label><div class="action-row">${button('Danh sách', 'view', 'list', state.view === 'list' ? 'selected' : '', 'menu')}${button('Lịch theo phòng', 'view', 'calendar', state.view === 'calendar' ? 'selected' : '', 'calendar')}</div></div>` +
      (state.view === 'calendar'
        ? `<div class="card mb">${filterBar(extra)}</div>${scheduleView(filteredShows)}`
        : table(
            [
              'Phim / phiên bản',
              'Cụm rạp / phòng',
              'Ngày chiếu',
              'Giờ chiếu',
              'Đã bán',
              'Trạng thái',
              '',
            ],
            filteredShows,
            (s) => {
              const m = get('movies', s.movieId),
                r = get('rooms', s.roomId),
                v = m.versions.find((v) => v.id === s.versionId)
              return `<tr><td><b>${esc(m.name)}</b><span class="cell-sub">${v.format} · ${esc(v.subtitle)}</span></td><td>${esc(get('cinemas', r.cinemaId).name.replace('Lumière ', ''))}<span class="cell-sub">${esc(r.name)} · ${esc(r.kind)}</span></td><td>${date(s.date)}</td><td><b>${s.time} – ${endTime(s)}</b><span class="cell-sub">Nghỉ ${s.breakMinutes} phút</span></td><td>${activeTickets(s).length}/${units(r)}</td><td>${status(s.status)}</td><td><div class="action-row">${rowActions(s.id)}${can('create') ? button('', 'copy-show', s.id, 'icon-btn ghost', 'copy') : ''}</div></td></tr>`
            },
            extra,
          ))
    )
  }
  function scheduleView(list) {
    const dateKey = state.filter.date || D.day(),
      rs = db.rooms.filter((r) => inScope(r.cinemaId))
    return `<div class="card"><div class="card-head"><h2>Lịch phòng · ${date(dateKey)}</h2><span class="muted" style="font-size:11px">Chọn ngày để đổi lịch · Bao gồm khoảng nghỉ</span></div><div class="card-body overflow"><div class="schedule"><div class="schedule-head"><span></span><div class="schedule-hours">${Array.from(
      {
        length: 24,
      },
      (_, i) => `<span>${String(i).padStart(2, '0')}:00</span>`,
    ).join('')}</div></div>${rs
      .map(
        (r) =>
          `<div class="schedule-room"><div class="room-label"><b>${esc(r.name)}</b><small class="cell-sub">${esc(get('cinemas', r.cinemaId).name.replace('Lumière ', ''))}</small>${status(r.status)}</div><div class="schedule-track">${list
            .filter((s) => s.date === dateKey && s.roomId === r.id && s.status !== 'Đã hủy')
            .map(
              (s) =>
                `<button class="show-block" data-action="detail" data-id="${s.id}" style="left:${(timeMinutes(s.time) / 1440) * 100}%;width:${(Math.min(get('movies', s.movieId).duration + s.breakMinutes, 1440 - timeMinutes(s.time)) / 1440) * 100}%" title="${esc(get('movies', s.movieId).name)}"><b>${esc(get('movies', s.movieId).name)}</b><small>${s.time} – ${endTime(s)}</small><small>${activeTickets(s).length} vé · ${get('movies', s.movieId).versions.find((v) => v.id === s.versionId).format}</small></button>`,
            )
            .join('')}</div></div>`,
      )
      .join('')}</div></div></div>`
  }
  function pricing() {
    const rows = filtered(
      db.pricing.filter((p) => p.cinemaIds.some(inScope)),
      (p) => p.name,
      {
        status: (p) => p.status,
        dayType: (p) => p.dayType,
      },
    )
    return (
      header('pricing', createAction('Tạo bảng giá', 'new-price')) +
      `<div class="notice info">${icon('ticket')}Bảng giá lễ/Tết được chọn trực tiếp cho suất chiếu. Mỗi định dạng có giá riêng; từ đúng 17:00 áp dụng khung buổi tối.</div>` +
      table(
        ['Bảng giá', 'Loại ngày', 'Phạm vi áp dụng', 'Mức độ hoàn chỉnh', 'Trạng thái', ''],
        rows,
        (p) => {
          const missing = Object.values(p.prices).filter((v) => v === '').length
          return `<tr><td><b>${esc(p.name)}</b><span class="cell-sub">${p.formats.join(' / ')} · Giá bán cố định</span></td><td><span class="chip">${p.dayType}</span></td><td>${p.cinemaIds.length === db.cinemas.length ? 'Toàn hệ thống' : p.cinemaIds.map((id) => esc(get('cinemas', id)?.name.replace('Lumière ', '') || id)).join('<br>')}</td><td>${missing ? status(missing + ' ô chưa nhập') : status('Hoàn chỉnh')}</td><td>${status(p.status)}</td><td><div class="action-row">${button('Tra giá', 'preview-price', p.id, 'small')}${can('edit') ? button('', 'edit-price', p.id, 'icon-btn ghost', 'edit') : ''}</div></td></tr>`
        },
        [
          ['status', 'Tất cả trạng thái', ['Đang áp dụng', 'Bản nháp', 'Ngừng áp dụng']],
          ['dayType', 'Tất cả loại ngày', ['Ngày thường', 'Cuối tuần', 'Lễ/Tết']],
        ],
      )
    )
  }
  function orders() {
    const rows = filtered(
      scopedOrders(),
      (o) =>
        [
          o.id,
          get('customers', o.customerId)?.name,
          get('customers', o.customerId)?.phone,
          ...o.tickets.map((t) => t.id),
        ].join(' '),
      {
        status: (o) => o.status,
        pay: (o) => db.payments.find((p) => p.orderId === o.id)?.status,
      },
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return (
      header(
        'orders',
        can('operate') ? button('Tạo đơn tại quầy', 'new-order', '', 'primary', 'plus') : '',
      ) +
      table(
        ['Đơn / khách hàng', 'Phim / suất chiếu', 'Cụm rạp', 'Tổng tiền', 'Đơn / thanh toán', ''],
        rows,
        (o) => {
          const s = get('shows', o.showId),
            m = get('movies', s.movieId),
            r = get('rooms', s.roomId),
            p = db.payments.find((p) => p.orderId === o.id)
          return `<tr><td><b>${o.id}</b><span class="cell-sub">${esc(get('customers', o.customerId)?.name || 'Khách vãng lai')}</span></td><td>${esc(m.name)}<span class="cell-sub">${s.time} · ${date(s.date)} · ${o.tickets.map((t) => t.seatId).join(', ')}</span></td><td>${esc(get('cinemas', r.cinemaId).name.replace('Lumière ', ''))}<span class="cell-sub">${esc(r.name)}</span></td><td class="money">${money(o.total)}</td><td>${status(o.status)}<span class="cell-sub">${status(p?.status || 'Chưa có giao dịch')}</span></td><td>${rowActions(o.id, false)}</td></tr>`
        },
        [
          ['status', 'Trạng thái đơn', ['Đã xác nhận', 'Chờ thanh toán', 'Đã hủy']],
          ['pay', 'Thanh toán', ['Thành công', 'Chờ thanh toán', 'Thất bại', 'Hết hạn']],
        ],
      )
    )
  }
  function payments() {
    const ids = scopedOrders().map((o) => o.id)
    const rows = filtered(
      db.payments.filter((p) => ids.includes(p.orderId)),
      (p) => p.id + ' ' + p.orderId + ' ' + p.reference,
      {
        status: (p) => p.status,
        method: (p) => p.method,
        review: (p) => (p.needsReview ? 'yes' : 'no'),
      },
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return (
      header('payments') +
      `<p class="module-hint">Thanh toán và đối chiếu trong bản này là mô phỏng; không kết nối cổng thanh toán hay thu tiền thật.</p>` +
      table(
        ['Giao dịch', 'Đơn đặt vé', 'Phương thức', 'Số tiền', 'Trạng thái', 'Đối chiếu', ''],
        rows,
        (p) =>
          `<tr class="${p.needsReview ? 'row-warning' : ''}"><td><b>${p.id}</b><span class="cell-sub">${stamp(p.createdAt)}</span></td><td>${button(p.orderId, 'order-detail', p.orderId, 'small ghost')}</td><td>${p.method}</td><td class="money">${money(p.amount)}</td><td>${status(p.status)}</td><td>${p.needsReview ? status('Cần kiểm tra') : '<span class="muted">Đã khớp</span>'}</td><td>${rowActions(p.id, false)}</td></tr>`,
        [
          ['status', 'Tất cả trạng thái', ['Chờ thanh toán', 'Thành công', 'Thất bại', 'Hết hạn']],
          ['method', 'Phương thức', ['VNPAY', 'MoMo', 'Thẻ ngân hàng', 'Tiền mặt']],
          [
            'review',
            'Đối chiếu',
            [
              ['yes', 'Cần kiểm tra'],
              ['no', 'Đã khớp'],
            ],
          ],
        ],
      )
    )
  }
  function checkin() {
    return (
      header('checkin') +
      `<div class="checkin-layout"><section class="card"><div class="card-body"><h2>Quét vé vào rạp</h2><p class="subtitle mb">Kiểm tra đúng phim, đúng phòng và đúng suất chiếu.</p><div class="scanner"><div class="scan-frame">${icon('scan')}</div><small>Khung quét QR minh họa · Không sử dụng camera</small></div><form id="checkin-form"><label class="field">Mã vé hoặc mã đơn<input name="code" required placeholder="Ví dụ: VE-DEMO hoặc DH-DEMO" autocomplete="off" value="${esc(state.check?.code || '')}"></label><button class="primary mt" style="width:100%">${icon('search')}Kiểm tra vé</button></form><div class="notice info mt">Vé thử hôm nay: <b>VE-DEMO</b>. Mỗi vé chỉ xác nhận sử dụng một lần.</div>${button('Quét QR mẫu (mô phỏng)', 'scan-demo', '', 'small ghost', 'scan')}</div></section><section id="checkin-result">${checkinResult()}</section></div>`
    )
  }
  function findTickets(code) {
    const orders = scopedOrders().filter(
      (o) =>
        o.id.toUpperCase() === code.toUpperCase() ||
        o.tickets.some((t) => t.id.toUpperCase() === code.toUpperCase()),
    )
    return orders.flatMap((o) =>
      o.tickets
        .filter(
          (t) =>
            o.id.toUpperCase() === code.toUpperCase() || t.id.toUpperCase() === code.toUpperCase(),
        )
        .map((t) => ({
          o,
          t,
        })),
    )
  }
  function ticketValidity(o, t) {
    if (o.status === 'Đã hủy' || t.status === 'Đã hủy') return 'Đã hủy'
    if (t.status === 'Đã sử dụng') return 'Đã sử dụng'
    if (!paid(o)) return 'Chưa thanh toán'
    const s = get('shows', o.showId)
    if (s.status === 'Đã hủy') return 'Suất đã hủy'
    if (s.date !== D.day()) return 'Không đúng ngày chiếu'
    return 'Hợp lệ'
  }
  function checkinResult() {
    if (!state.check)
      return `<div class="card" style="height:100%;display:grid;place-items:center">${empty('Sẵn sàng kiểm tra vé', 'Nhập mã vé hoặc mô phỏng quét QR để bắt đầu.')}</div>`
    const found = findTickets(state.check.code)
    if (!found.length)
      return `<div class="card ticket-result invalid">${empty('Không tìm thấy vé', 'Mã không tồn tại hoặc nằm ngoài cụm rạp được phân công.')}</div>`
    return found
      .map(({ o, t }) => {
        const s = get('shows', o.showId),
          r = get('rooms', s.roomId),
          m = get('movies', s.movieId),
          valid = ticketValidity(o, t)
        return `<div class="card ticket-result ${valid === 'Hợp lệ' ? 'valid' : 'invalid'} mb"><div style="display:flex;justify-content:space-between;align-items:center"><h2>${esc(t.id)}</h2>${status(valid)}</div><div class="ticket-divider"></div><div class="overview-hero"><img src="${m.poster}" class="poster" style="width:65px;height:95px" alt=""><div><h2>${esc(m.name)}</h2><p class="subtitle">${esc(get('cinemas', r.cinemaId).name)}</p><p class="subtitle">${r.name} · ${s.time} · ${date(s.date)}</p></div></div><dl class="detail-grid">${detailField('Ghế / hạng', t.seatId + ' · ' + D.seatTypes[t.type].label)}${detailField('Đối tượng vé', esc(t.category))}${detailField('Đơn đặt vé', o.id)}${detailField('Trạng thái thanh toán', db.payments.find((p) => p.orderId === o.id)?.status || '—')}</dl>${valid === 'Hợp lệ' && can('operate') ? button('Xác nhận check-in', 'confirm-checkin', t.id, 'primary', 'check') : `<p class="notice ${valid === 'Đã sử dụng' ? '' : 'error'}">${valid === 'Đã sử dụng' ? 'Vé này đã được sử dụng. Không thể check-in lại.' : valid === 'Hợp lệ' ? 'Vai trò hiện tại chỉ được tra cứu.' : 'Vé không đủ điều kiện check-in: ' + valid + '.'}</p>`}</div>`
      })
      .join('')
  }
  function products() {
    const rows = filtered(
      db.products.filter((p) => p.cinemaIds.some(inScope)),
      (p) => p.name + ' ' + p.description,
      {
        status: (p) => p.status,
        kind: (p) => p.kind,
      },
    )
    return (
      header('products', createAction('Thêm sản phẩm')) +
      `<div class="card mb">${filterBar([
        ['kind', 'Tất cả danh mục', ['Đồ ăn', 'Thức uống', 'Combo']],
        ['status', 'Trạng thái', ['Đang bán', 'Tạm ngừng']],
      ])}</div><div class="product-grid">${rows.map((p) => `<article class="card"><div class="product-art"><img src="${esc(p.image)}" alt="${esc(p.name)}"></div><div class="card-body"><div style="display:flex;justify-content:space-between;gap:8px"><h2>${esc(p.name)}</h2>${status(p.status)}</div><p class="subtitle">${esc(p.description)}</p><p class="money mt" style="font-size:21px">${money(p.price)}</p><div class="mini-summary">${p.components.map((c) => c.qty + ' × ' + esc(get('products', c.productId)?.name)).join(' · ') || esc(p.kind)}</div><p class="subtitle">${p.cinemaIds.length} cụm rạp áp dụng</p><div class="action-row mt">${button('Chi tiết', 'detail', p.id, 'small')}${can('edit') ? button('Chỉnh sửa', 'edit', p.id, 'small ghost') : ''}</div></div></article>`).join('')}</div>${!rows.length ? empty() : ''}<p class="metric-note mt">Không theo dõi tồn kho trong phạm vi giao diện này.</p>`
    )
  }
  function promoSummary(p) {
    return `${p.mode === 'Phần trăm' ? 'Giảm ' + p.value + '%' + (p.maxDiscount ? ', tối đa ' + money(p.maxDiscount) : '') : 'Giảm ' + money(p.value)} cho đơn từ ${money(p.minOrder)}. ${p.cinemaIds.length} cụm rạp · ${p.roomKinds.join(', ')} · ${p.formats.join(', ')}. ${p.combine ? 'Được' : 'Không'} kết hợp ưu đãi khác. Tối đa ${p.limit} lượt.`
  }
  function promotions() {
    return (
      header('promotions', createAction('Tạo khuyến mãi')) +
      table(
        ['Chương trình', 'Thời gian', 'Giá trị / điều kiện', 'Lượt sử dụng', 'Trạng thái', ''],
        filtered(
          db.promotions.filter((p) => p.cinemaIds.some(inScope)),
          (p) => p.name + ' ' + p.code,
          {
            status: (p) => p.status,
          },
        ),
        (p) =>
          `<tr><td><b>${esc(p.name)}</b><span class="cell-sub">Mã: ${esc(p.code)}</span></td><td>${date(p.start)}<span class="cell-sub">đến ${date(p.end)}</span></td><td>${p.mode === 'Phần trăm' ? p.value + '%' : money(p.value)}<span class="cell-sub">Đơn từ ${money(p.minOrder)} · ${p.combine ? 'Có' : 'Không'} cộng dồn</span></td><td>${db.orders.filter((o) => o.promoId === p.id && paid(o)).length} / ${p.limit}</td><td>${status(p.status)}</td><td>${rowActions(p.id)}</td></tr>`,
        [['status', 'Trạng thái', ['Đang áp dụng', 'Sắp diễn ra', 'Ngừng áp dụng']]],
      )
    )
  }
  function customers() {
    const ids = new Set(scopedOrders().map((o) => o.customerId))
    const rows = filtered(
      db.customers.filter(
        (c) => (state.scope === 'all' && role() === 'Quản trị hệ thống') || ids.has(c.id),
      ),
      (c) => c.name + ' ' + c.phone + ' ' + c.email,
      {
        tier: (c) => c.tier,
      },
    )
    return (
      header('customers', createAction('Thêm khách hàng')) +
      table(
        ['Khách hàng', 'Liên hệ', 'Phân loại', 'Đơn đã mua', 'Chi tiêu trong phạm vi', ''],
        rows,
        (c) => {
          const os = scopedOrders().filter((o) => o.customerId === c.id && paid(o))
          return `<tr><td><div class="row-title"><div class="avatar">${esc(
            c.name
              .split(' ')
              .slice(-2)
              .map((s) => s[0])
              .join(''),
          )}</div><b>${esc(c.name)}</b></div></td><td>${esc(c.phone)}<span class="cell-sub">${esc(c.email)}</span></td><td>${status(c.tier)}${db.settings.membership && c.tier !== 'Khách vãng lai' ? '<span class="cell-sub">' + num(Math.floor(os.reduce((s, o) => s + o.total, 0) / 10000)) + ' điểm từ chi tiêu</span>' : ''}</td><td>${os.length}</td><td class="money">${money(os.reduce((s, o) => s + o.total, 0))}</td><td>${rowActions(c.id)}</td></tr>`
        },
        [['tier', 'Hạng khách hàng', ['Bạc', 'Vàng', 'Khách vãng lai']]],
      )
    )
  }
  function staff() {
    return (
      header('staff', createAction('Thêm tài khoản')) +
      `<div class="card mb"><div class="tabs">${button('Tài khoản', 'tab', 'accounts', state.tab !== 'permissions' ? 'active' : '')}${button('Ma trận phân quyền', 'tab', 'permissions', state.tab === 'permissions' ? 'active' : '')}</div></div>` +
      (state.tab === 'permissions'
        ? permissionView()
        : table(
            ['Nhân viên', 'Vai trò', 'Cụm rạp phụ trách', 'Trạng thái', ''],
            filtered(
              db.staff.filter((e) => e.cinemaIds.some(inScope)),
              (e) => e.name + ' ' + e.email,
              {
                role: (e) => e.role,
                status: (e) => e.status,
              },
            ),
            (e) =>
              `<tr><td><b>${esc(e.name)}</b><span class="cell-sub">${esc(e.email)}</span></td><td>${esc(e.role)}</td><td>${e.cinemaIds.length === db.cinemas.length ? 'Toàn hệ thống' : e.cinemaIds.map((id) => esc(get('cinemas', id)?.name.replace('Lumière ', ''))).join('<br>')}</td><td>${status(e.status)}</td><td>${rowActions(e.id)}</td></tr>`,
            [
              [
                'role',
                'Tất cả vai trò',
                ['Quản trị hệ thống', 'Quản lý rạp', 'Nhân viên bán vé', 'Nhân viên soát vé'],
              ],
              ['status', 'Trạng thái', ['Hoạt động', 'Tạm khóa']],
            ],
          ))
    )
  }
  function permissionView() {
    const r = state.filter.permissionRole || 'Quản lý rạp',
      per = permissions(r)
    return `<div class="card"><div class="card-head"><h2>Quyền theo chức năng</h2><select id="permission-role" aria-label="Vai trò phân quyền" style="padding:8px">${opt(['Quản trị hệ thống', 'Quản lý rạp', 'Nhân viên bán vé', 'Nhân viên soát vé'], r)}</select></div><div class="card-body"><div class="notice info">Quyền trong bản minh họa được kiểm tra trước mỗi thao tác. Đây là mô phỏng giao diện, không thay thế phân quyền phía máy chủ.</div><form id="permissions-form"><div class="table-wrap"><table class="permission-table"><thead><tr><th>Chức năng</th><th>Xem</th><th>Tạo</th><th>Sửa</th><th>Thực hiện nghiệp vụ</th></tr></thead><tbody>${Object.entries(
      titles,
    )
      .map(
        ([k, v]) =>
          `<tr><td>${v}</td>${['view', 'create', 'edit', 'operate'].map((a) => `<td><input type="checkbox" name="${k}.${a}" ${per[k]?.[a] ? 'checked' : ''} ${!can('edit') || r === 'Quản trị hệ thống' ? 'disabled' : ''} aria-label="${v}: ${a}"></td>`).join('')}</tr>`,
      )
      .join(
        '',
      )}</tbody></table></div>${can('edit') && r !== 'Quản trị hệ thống' ? '<button class="primary mt" type="submit">Lưu phân quyền</button>' : '<p class="metric-note mt">Quyền quản trị hệ thống luôn được giữ để tránh khóa cấu hình.</p>'}</form></div></div>`
  }
  function aggregate(m, group) {
    const map = new Map()
    for (const o of m.paid) {
      const s = get('shows', o.showId),
        r = get('rooms', s.roomId)
      const key =
        group === 'movie'
          ? get('movies', s.movieId).name
          : group === 'cinema'
            ? get('cinemas', r.cinemaId).name
            : group === 'room'
              ? r.kind
              : o.createdAt.slice(0, 10)
      if (!map.has(key))
        map.set(key, {
          key,
          revenue: 0,
          tickets: 0,
          food: 0,
          discount: 0,
          seats: 0,
          capacity: 0,
        })
      const a = map.get(key)
      a.revenue += o.total
      a.tickets += o.tickets.length
      a.food += o.items.reduce((v, i) => v + i.unitPrice * i.qty, 0)
      a.discount += o.discount
      a.seats += o.tickets.reduce((v, t) => v + D.seatTypes[t.type].capacity, 0)
    }
    for (const s of m.shows) {
      const r = get('rooms', s.roomId)
      const key =
        group === 'movie'
          ? get('movies', s.movieId).name
          : group === 'cinema'
            ? get('cinemas', r.cinemaId).name
            : group === 'room'
              ? r.kind
              : s.date
      if (!map.has(key))
        map.set(key, {
          key,
          revenue: 0,
          tickets: 0,
          food: 0,
          discount: 0,
          seats: 0,
          capacity: 0,
        })
      map.get(key).capacity += cap(r)
    }
    return [...map.values()].sort((a, b) =>
      group === 'date' ? a.key.localeCompare(b.key) : b.revenue - a.revenue,
    )
  }
  function reports() {
    const m = metrics(),
      group = state.filter.group || 'date',
      rows = aggregate(m, group)
    return (
      header('reports', button('Xuất CSV', 'export', '', 'primary', 'download')) +
      periodFilters(
        `<label>Nhóm báo cáo<select id="report-group">${opt(
          [
            ['date', 'Theo thời gian'],
            ['movie', 'Theo phim'],
            ['cinema', 'Theo cụm rạp'],
            ['room', 'Theo loại phòng'],
          ],
          group,
        )}</select></label>`,
      ) +
      statsHTML(m) +
      `<div class="grid-main"><section class="card"><div class="card-head"><h2>Diễn biến doanh thu</h2><span class="legend"><span><i></i>Thực thu · VNĐ</span></span></div><div class="card-body">${chart(m)}</div></section><section class="card"><div class="card-body"><h2>Đồ ăn & hiệu quả ưu đãi</h2><dl class="detail-grid">${detailField('Doanh thu đồ ăn', money(m.food))}${detailField('Đơn có ưu đãi', num(m.paid.filter((o) => o.discount > 0).length))}${detailField('Tổng giảm giá', money(m.paid.reduce((a, o) => a + o.discount, 0)))}${detailField('Thực thu đơn có ưu đãi', money(m.paid.filter((o) => o.discount > 0).reduce((a, o) => a + o.total, 0)))}</dl><p class="metric-note">Số liệu ưu đãi mô tả doanh số ghi nhận; không suy ra mức tăng doanh thu do chương trình.</p></div></section></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Nhóm báo cáo</th><th>Vé bán (đơn vị)</th><th>Lấp đầy</th><th>Đồ ăn</th><th>Giảm giá</th><th>Thực thu</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${esc(group === 'date' ? date(r.key) : r.key)}</b></td><td>${num(r.tickets)}</td><td>${r.capacity ? ((r.seats / r.capacity) * 100).toFixed(1) : '0.0'}%</td><td>${money(r.food)}</td><td>${money(r.discount)}</td><td class="money">${money(r.revenue)}</td></tr>`).join('')}</tbody></table></div>${!rows.length ? empty() : ''}</div><p class="metric-note mt">Thực thu = tổng tiền các đơn đã xác nhận và giao dịch thành công; đã trừ giảm giá, gồm đồ ăn. Lấp đầy = số chỗ đã bán / sức chứa suất chiếu trong kỳ (ghế đôi, giường tính 2 chỗ). Đơn, doanh thu theo ngày tạo đơn; sức chứa theo ngày chiếu. CSV dùng UTF-8 và giữ số tiền nguyên VNĐ.</p>`
    )
  }
  function settings() {
    const s = db.settings
    return (
      header('settings') +
      `<form id="settings-form"><div class="settings-layout"><section class="card"><div class="card-head"><h2>Thông tin thương hiệu</h2><img src="${esc(s.logo)}" width="35" height="35" alt="Logo thương hiệu"></div><div class="card-body"><div class="form-grid">${field('brand', 'Tên thương hiệu', s.brand, 'text', 'required', true)}${field('email', 'Email liên hệ', s.email, 'email', 'required')}${field('phone', 'Số điện thoại', s.phone, 'text', 'required')}${field('logo', 'Đường dẫn logo', s.logo, 'text', '', true)}<div class="notice info full">Thiết lập áp dụng cho toàn hệ thống, không phụ thuộc bộ chọn cụm rạp.</div></div></div></section><section class="card"><div class="card-head"><h2>Thiết lập vận hành</h2></div><div class="card-body"><div class="form-grid">${select('timezone', 'Múi giờ', ['Asia/Ho_Chi_Minh'], s.timezone)}${select('currency', 'Tiền tệ', ['VNĐ'], s.currency)}${field('holdMinutes', 'Thời gian giữ ghế (phút)', s.holdMinutes, 'number', 'min="1" max="60" required')}${field('breakMinutes', 'Nghỉ giữa suất (phút)', s.breakMinutes, 'number', 'min="0" max="120" required')}<label class="check-field full"><input class="switch" name="membership" type="checkbox" ${s.membership ? 'checked' : ''}>Bật hiển thị điểm thành viên</label></div></div></section></div><div class="action-row mt">${can('edit') ? '<button type="submit" class="primary">Lưu cài đặt</button>' : status('Chỉ xem')}${can('edit') ? button('Khôi phục dữ liệu mẫu', 'reset', '', 'danger', 'refresh') : ''}</div></form><p class="metric-note mt">Khoảng nghỉ mới là giá trị mặc định khi tạo suất. Các suất hiện có giữ nguyên khoảng nghỉ.</p>`
    )
  }
  function logs() {
    const rows = filtered(db.logs, (l) => l.actor + ' ' + l.action + ' ' + l.target)
    return (
      header('logs') +
      table(
        ['Thời gian', 'Người thao tác', 'Hành động', 'Đối tượng'],
        rows,
        (l) =>
          `<tr><td>${stamp(l.at)}</td><td><b>${esc(l.actor)}</b></td><td>${esc(l.action)}</td><td>${esc(l.target)}</td></tr>`,
      )
    )
  }
  let editing = null,
    wizard = null,
    orderDraft = null
  const cinemaOptions = () =>
    db.cinemas.filter((c) => allowedCinemas().includes(c.id)).map((c) => [c.id, c.name])
  const roomKinds = [
    'Tiêu chuẩn',
    'IMAX',
    '4DX',
    'ScreenX',
    'Cao cấp',
    'Giường nằm',
    '4DX / ScreenX',
  ]
  function entityForm(type, id, copy = false) {
    const item = id ? get(type, id) : null
    if (!guard(item && !copy ? 'edit' : 'create', type)) return
    editing = {
      type,
      id: copy ? null : id,
    }
    const cids = item?.cinemaIds || [state.scope !== 'all' ? state.scope : allowedCinemas()[0]],
      x = item || {}
    let body = ''
    if (type === 'movies')
      body =
        field('name', 'Tên phim *', x.name, 'text', 'required maxlength="150"', true) +
        textArea('description', 'Nội dung phim', x.description) +
        field(
          'duration',
          'Thời lượng (phút) *',
          x.duration || 110,
          'number',
          'min="1" max="480" required',
        ) +
        field('genre', 'Thể loại *', x.genre, 'text', 'required') +
        field('country', 'Quốc gia', x.country) +
        select('age', 'Phân loại độ tuổi', ['P', 'K', 'T13', 'T16', 'T18'], x.age || 'P') +
        field('director', 'Đạo diễn', x.director) +
        field('cast', 'Diễn viên', x.cast) +
        field('release', 'Ngày khởi chiếu *', x.release || D.day(), 'date', 'required') +
        select(
          'status',
          'Trạng thái',
          ['Sắp chiếu', 'Đang chiếu', 'Ngừng chiếu'],
          x.status || 'Sắp chiếu',
        ) +
        field('poster', 'Đường dẫn poster', x.poster || 'assets/images/poster-1.svg') +
        field('trailer', 'Đường dẫn trailer (HTTPS)', x.trailer, 'url') +
        `<div class="form-section">Phiên bản trình chiếu</div><div class="full" id="versions">${(
          x.versions || [
            {
              id: 'V1',
              format: '2D',
              language: 'Nguyên bản',
              subtitle: 'Phụ đề Việt',
            },
          ]
        )
          .map(versionRow)
          .join(
            '',
          )}</div><div class="full">${button('Thêm phiên bản', 'add-version', '', 'small', 'plus')}</div><div class="notice info full">Thông tin phim dùng chung toàn hệ thống. Khi phim đã có suất mở bán, thời lượng và phiên bản đang dùng được bảo vệ.</div>`
    if (type === 'cinemas')
      body =
        field('name', 'Tên cụm rạp *', x.name, 'text', 'required', true) +
        field('code', 'Mã cụm rạp *', x.code, 'text', 'required pattern="[A-Za-z0-9-]+"') +
        field('city', 'Tỉnh / thành phố *', x.city, 'text', 'required') +
        field('address', 'Địa chỉ *', x.address, 'text', 'required', true) +
        field('phone', 'Điện thoại *', x.phone, 'text', 'required') +
        field('email', 'Email liên hệ', x.email, 'email') +
        field('hours', 'Giờ mở cửa', x.hours || '08:00 – 00:00') +
        select('status', 'Trạng thái', ['Hoạt động', 'Ngừng hoạt động'], x.status || 'Hoạt động') +
        field('image', 'Đường dẫn ảnh', x.image || 'assets/images/cinema.svg', 'text', '', true) +
        textArea('amenities', 'Tiện ích (ngăn cách bằng dấu phẩy)', x.amenities)
    if (type === 'rooms')
      body =
        select('cinemaId', 'Thuộc cụm rạp *', cinemaOptions(), x.cinemaId || cids[0]) +
        field('name', 'Tên phòng *', x.name, 'text', 'required') +
        select('kind', 'Loại phòng', roomKinds, x.kind || 'Tiêu chuẩn') +
        select(
          'status',
          'Trạng thái',
          ['Hoạt động', 'Bảo trì', 'Ngừng hoạt động'],
          x.status || 'Hoạt động',
        ) +
        checks('formats', 'Định dạng phòng hỗ trợ *', ['2D', '3D'], x.formats || ['2D']) +
        textArea(
          'technology',
          'Công nghệ trình chiếu / âm thanh',
          x.technology || 'Máy chiếu laser · Âm thanh 7.1',
        ) +
        `<div class="notice info full">${item ? 'Sơ đồ ghế được chỉnh riêng trong tab Sơ đồ ghế.' : 'Phòng mới có 7 hàng × 12 vị trí, có lối đi. Hãy chỉnh sơ đồ trước khi mở bán.'}</div>`
    if (type === 'shows') {
      const rs = db.rooms.filter((r) => inScope(r.cinemaId))
      body =
        select(
          'movieId',
          'Phim *',
          db.movies.filter((m) => m.status !== 'Ngừng chiếu').map((m) => [m.id, m.name]),
          x.movieId || db.movies[0].id,
        ) +
        `<label class="field">Phiên bản *<select name="versionId" id="show-version"></select></label>` +
        select(
          'roomId',
          'Phòng chiếu *',
          rs.map((r) => [
            r.id,
            get('cinemas', r.cinemaId).name.replace('Lumière ', '') +
              ' · ' +
              r.name +
              ' · ' +
              r.kind,
          ]),
          x.roomId || rs[0]?.id,
        ) +
        select(
          'status',
          'Tình trạng mở bán',
          ['Mở bán', 'Đóng bán', 'Đã hủy'],
          x.status || 'Mở bán',
        ) +
        field('date', 'Ngày chiếu *', x.date || D.day(), 'date', 'required') +
        field('time', 'Giờ bắt đầu *', x.time || '10:00', 'time', 'required') +
        field(
          'breakMinutes',
          'Khoảng nghỉ (phút)',
          x.breakMinutes ?? db.settings.breakMinutes,
          'number',
          'required min="0" max="120"',
        ) +
        select(
          'priceId',
          'Bảng giá *',
          db.pricing
            .filter((p) => p.status === 'Đang áp dụng' && p.cinemaIds.some(inScope))
            .map((p) => [p.id, p.name + ' · ' + p.dayType]),
          x.priceId || db.pricing[0].id,
        ) +
        `<div class="notice info full" id="show-end">Giờ kết thúc được tính theo thời lượng phim.</div><div class="full" id="show-validation"></div>`
    }
    if (type === 'products')
      body =
        field('name', 'Tên sản phẩm *', x.name, 'text', 'required', true) +
        select('kind', 'Danh mục', ['Đồ ăn', 'Thức uống', 'Combo'], x.kind || 'Đồ ăn') +
        field('price', 'Giá bán (VNĐ) *', x.price ?? 0, 'number', 'min="0" step="1000" required') +
        select('status', 'Trạng thái bán', ['Đang bán', 'Tạm ngừng'], x.status || 'Đang bán') +
        field('image', 'Đường dẫn ảnh', x.image || 'assets/images/popcorn.svg') +
        textArea('description', 'Mô tả', x.description) +
        checks('cinemaIds', 'Cụm rạp được bán *', cinemaOptions(), cids) +
        `<div class="form-section">Thành phần combo (chỉ bắt buộc với Combo)</div><div class="full" id="components">${(x
          .components?.length
          ? x.components
          : [
              {
                productId: 'F1',
                qty: 1,
              },
            ]
        )
          .map(componentRow)
          .join(
            '',
          )}</div><div class="full">${button('Thêm thành phần', 'add-component', '', 'small', 'plus')}</div>`
    if (type === 'promotions')
      body =
        field('name', 'Tên chương trình *', x.name, 'text', 'required') +
        field('code', 'Mã ưu đãi *', x.code, 'text', 'required pattern="[A-Za-z0-9_-]+"') +
        field('start', 'Từ ngày *', x.start || D.day(), 'date', 'required') +
        field('end', 'Đến hết ngày *', x.end || D.day(30), 'date', 'required') +
        select('mode', 'Cách giảm', ['Số tiền', 'Phần trăm'], x.mode || 'Số tiền') +
        field('value', 'Mức giảm (VNĐ hoặc %)', x.value || 10000, 'number', 'min="1" required') +
        field(
          'maxDiscount',
          'Giảm tối đa (VNĐ)',
          x.maxDiscount ?? 50000,
          'number',
          'min="0" required',
        ) +
        field(
          'minOrder',
          'Giá trị đơn tối thiểu (VNĐ)',
          x.minOrder || 0,
          'number',
          'min="0" required',
        ) +
        field('limit', 'Giới hạn tổng lượt sử dụng', x.limit || 100, 'number', 'min="1" required') +
        select(
          'status',
          'Trạng thái',
          ['Đang áp dụng', 'Sắp diễn ra', 'Ngừng áp dụng'],
          x.status || 'Sắp diễn ra',
        ) +
        checks('cinemaIds', 'Cụm rạp áp dụng *', cinemaOptions(), cids) +
        checks('roomKinds', 'Loại phòng áp dụng *', roomKinds, x.roomKinds || ['Tiêu chuẩn']) +
        checks('formats', 'Định dạng *', ['2D', '3D'], x.formats || ['2D']) +
        checks('categories', 'Đối tượng vé *', D.categories, x.categories || D.categories) +
        `<label class="check-field full"><input type="checkbox" name="combine" ${x.combine ? 'checked' : ''}>Cho phép kết hợp ưu đãi khác</label>` +
        textArea('description', 'Ghi chú chương trình', x.description)
    if (type === 'customers')
      body =
        field('name', 'Họ và tên *', x.name, 'text', 'required', true) +
        field('phone', 'Điện thoại *', x.phone, 'tel', 'required') +
        field('email', 'Email', x.email, 'email') +
        select(
          'tier',
          'Loại khách hàng',
          ['Khách vãng lai', 'Bạc', 'Vàng'],
          x.tier || 'Khách vãng lai',
        ) +
        `<div class="notice info full">Điểm và tổng chi tiêu được tính từ đơn thanh toán thành công. Thông tin khách hàng dùng chung toàn hệ thống.</div>`
    if (type === 'staff')
      body =
        field('name', 'Tên nhân viên *', x.name, 'text', 'required') +
        field('email', 'Email tài khoản *', x.email, 'email', 'required') +
        select(
          'role',
          'Vai trò',
          ['Quản trị hệ thống', 'Quản lý rạp', 'Nhân viên bán vé', 'Nhân viên soát vé'],
          x.role || 'Nhân viên bán vé',
        ) +
        select('status', 'Trạng thái', ['Hoạt động', 'Tạm khóa'], x.status || 'Hoạt động') +
        checks('cinemaIds', 'Cụm rạp phụ trách *', cinemaOptions(), cids) +
        `<div class="notice info full">Đây là tài khoản mô phỏng để kiểm tra giao diện; không tạo thông tin đăng nhập thật.</div>`
    formDialog(
      (item ? 'Chỉnh sửa ' : 'Thêm ') +
        {
          movies: 'phim',
          cinemas: 'cụm rạp',
          rooms: 'phòng chiếu',
          shows: 'suất chiếu',
          products: 'sản phẩm',
          promotions: 'khuyến mãi',
          customers: 'khách hàng',
          staff: 'tài khoản',
        }[type],
      body,
      copy ? 'Tạo suất sao chép' : item ? 'Lưu thay đổi' : 'Tạo mới',
      type === 'movies' || type === 'promotions',
    )
    if (type === 'shows') {
      syncShowVersions(x.versionId)
      updateShowHints()
    }
  }
  function versionRow(v = {}) {
    return `<div class="version-row form-grid" style="grid-template-columns:80px 1fr 1fr 35px;gap:8px;margin-bottom:10px"><input type="hidden" data-version-id value="${esc(v.id || 'V' + Date.now())}"><select aria-label="Định dạng" data-version-format>${opt(['2D', '3D'], v.format || '2D')}</select><input data-version-language aria-label="Ngôn ngữ" required value="${esc(v.language || 'Nguyên bản')}" placeholder="Ngôn ngữ"><select data-version-subtitle aria-label="Phụ đề hoặc lồng tiếng">${opt(['Phụ đề Việt', 'Lồng tiếng', 'Không phụ đề'], v.subtitle || 'Phụ đề Việt')}</select>${button('', 'remove-version', '', 'icon-btn ghost', 'close')}</div>`
  }
  function componentRow(c = {}) {
    return `<div class="component-row action-row mb"><select data-component-product aria-label="Sản phẩm thành phần" style="padding:8px;flex:1">${opt(
      db.products
        .filter((p) => p.kind !== 'Combo' && p.id !== editing?.id)
        .map((p) => [p.id, p.name]),
      c.productId,
    )}</select><input type="number" min="1" max="99" required aria-label="Số lượng thành phần" data-component-qty value="${c.qty || 1}" style="width:70px;padding:8px">${button('', 'remove-component', '', 'icon-btn ghost', 'close')}</div>`
  }
  function syncShowVersions(value) {
    const f = $('#entity-form')
    const m = get('movies', f.elements.movieId.value)
    $('#show-version').innerHTML = opt(
      m.versions.map((v) => [v.id, v.format + ' · ' + v.language + ' · ' + v.subtitle]),
      value || m.versions[0].id,
    )
  }
  function showErrors(s, ignoreId) {
    const errors = [],
      movie = get('movies', s.movieId),
      room = get('rooms', s.roomId),
      version = movie?.versions.find((v) => v.id === s.versionId),
      p = get('pricing', s.priceId)
    if (!room || !movie || !version) return ['Thiếu phim, phòng hoặc phiên bản hợp lệ.']
    if (s.status === 'Đã hủy') return []
    if (room.status !== 'Hoạt động' || get('cinemas', room.cinemaId).status !== 'Hoạt động')
      errors.push('Phòng hoặc cụm rạp đang bảo trì / ngừng hoạt động.')
    if (!room.formats.includes(version.format))
      errors.push('Định dạng phiên bản phim không được phòng hỗ trợ.')
    if (
      !p ||
      p.status !== 'Đang áp dụng' ||
      !p.cinemaIds.includes(room.cinemaId) ||
      !p.roomKinds.includes(room.kind) ||
      !p.formats.includes(version.format)
    )
      errors.push('Bảng giá không phù hợp với cụm rạp, loại phòng hoặc định dạng.')
    else {
      const time = s.time >= '17:00' ? 'after' : 'before'
      for (const type of [
        ...new Set(room.seats.filter((s) => D.seatTypes[s.type].capacity).map((s) => s.type)),
      ]) {
        const vals = D.categories.map(
          (cat) => p.prices[[version.format, time, type, cat].join('|')],
        )
        if (vals.some((v) => v === undefined || v === ''))
          errors.push('Bảng giá còn thiếu giá cho ' + D.seatTypes[type].label + '.')
        if (vals.every((v) => v === 'NA'))
          errors.push('Không có giá bán khả dụng cho ' + D.seatTypes[type].label + '.')
      }
    }
    const start = new Date(s.date + 'T' + s.time + ':00+07:00').getTime(),
      end = start + (movie.duration + Number(s.breakMinutes)) * 60000
    const conflict = db.shows.find((other) => {
      if (other.id === ignoreId || other.roomId !== room.id || other.status === 'Đã hủy')
        return false
      const st = new Date(other.date + 'T' + other.time + ':00+07:00').getTime(),
        en = st + (get('movies', other.movieId).duration + other.breakMinutes) * 60000
      return start < en && end > st
    })
    if (conflict)
      errors.push(
        'Trùng lịch ' +
          get('movies', conflict.movieId).name +
          ' lúc ' +
          conflict.time +
          ' ngày ' +
          date(conflict.date) +
          ' (đã tính khoảng nghỉ).',
      )
    if (movie.release > s.date) errors.push('Ngày chiếu trước ngày khởi chiếu của phim.')
    return errors
  }
  function showFormValue() {
    const v = Object.fromEntries(new FormData($('#entity-form')))
    return {
      ...v,
      breakMinutes: Number(v.breakMinutes),
    }
  }
  function updateShowHints() {
    if (!$('#show-end')) return
    const v = showFormValue(),
      m = get('movies', v.movieId)
    $('#show-end').textContent =
      `Kết thúc: ${clock(timeMinutes(v.time) + m.duration)} · Sẵn sàng suất tiếp: ${clock(timeMinutes(v.time) + m.duration + v.breakMinutes)} (${m.duration} phút phim + ${v.breakMinutes} phút nghỉ).`
    const errors = showErrors(v, editing.id)
    $('#show-validation').innerHTML = errors.length
      ? `<div class="notice error">${errors.map(esc).join('<br>')}</div>`
      : '<div class="notice success">Lịch chiếu phù hợp với phòng và bảng giá.</div>'
  }
  function safeURL(s) {
    return !s || /^https:\/\//i.test(s) || /^assets\/[\w/.-]+$/i.test(s)
  }
  function saveEntity(form) {
    const { type, id } = editing
    if (!guard(id ? 'edit' : 'create', type)) return
    const f = new FormData(form),
      v = Object.fromEntries(f),
      old = id ? get(type, id) : null
    for (const k of ['cinemaIds', 'formats', 'roomKinds', 'categories'])
      if (f.has(k)) v[k] = f.getAll(k)
    const fail = (msg) => formError(msg)
    let out = {
      ...old,
      ...v,
    }
    if (type === 'movies') {
      out.duration = Number(v.duration)
      out.versions = $$('.version-row', form).map((row) => ({
        id: $('[data-version-id]', row).value,
        format: $('[data-version-format]', row).value,
        language: $('[data-version-language]', row).value.trim(),
        subtitle: $('[data-version-subtitle]', row).value,
      }))
      if (!out.versions.length) return fail('Cần ít nhất một phiên bản phim.')
      if (!safeURL(out.poster) || !safeURL(out.trailer))
        return fail('Ảnh dùng đường dẫn assets/ hoặc HTTPS. Trailer phải dùng HTTPS.')
      if (
        old &&
        db.shows.some((s) => s.movieId === id && s.status !== 'Đã hủy') &&
        (old.duration !== out.duration ||
          db.shows.some(
            (s) =>
              s.movieId === id &&
              !out.versions.some(
                (v) =>
                  v.id === s.versionId &&
                  v.format === old.versions.find((x) => x.id === s.versionId)?.format,
              ),
          ))
      )
        return fail(
          'Phim đã có lịch chiếu. Giữ thời lượng và phiên bản đang sử dụng, hoặc hủy các suất chưa bán vé trước.',
        )
    }
    if (type === 'cinemas') {
      if (db.cinemas.some((c) => c.code === v.code && c.id !== id))
        return fail('Mã cụm rạp đã tồn tại.')
      if (!safeURL(out.image)) return fail('Ảnh chỉ dùng đường dẫn assets/ hoặc HTTPS.')
      if (
        out.status === 'Ngừng hoạt động' &&
        db.shows.some((s) => showCinema(s) === id && s.status === 'Mở bán' && s.date >= D.day())
      )
        return fail('Cụm rạp còn suất mở bán. Hãy đóng bán các suất trước.')
    }
    if (type === 'rooms') {
      out.formats = f.getAll('formats')
      if (!out.formats.length) return fail('Chọn ít nhất một định dạng phòng hỗ trợ.')
      if (!allowedCinemas().includes(out.cinemaId))
        return fail('Cụm rạp nằm ngoài phạm vi phụ trách.')
      if (db.rooms.some((r) => r.id !== id && r.cinemaId === out.cinemaId && r.name === out.name))
        return fail('Tên phòng đã tồn tại trong cụm rạp này.')
      if (
        old &&
        db.shows.some((s) => s.roomId === id && s.status !== 'Đã hủy') &&
        (out.cinemaId !== old.cinemaId ||
          out.kind !== old.kind ||
          old.formats.some((fmt) => !out.formats.includes(fmt)))
      )
        return fail(
          'Phòng đang có lịch chiếu. Không được chuyển cụm, loại phòng hoặc bỏ định dạng đang dùng.',
        )
      if (
        out.status !== 'Hoạt động' &&
        db.shows.some((s) => s.roomId === id && s.status === 'Mở bán' && s.date >= D.day())
      )
        return fail('Phòng còn suất mở bán sắp tới. Hãy đóng bán các suất trước khi bảo trì.')
      if (!old) out.seats = D.seats(out.kind)
    }
    if (type === 'shows') {
      out.breakMinutes = Number(out.breakMinutes)
      const errors = showErrors(out, id)
      if (errors.length) return fail(errors.join(' '))
      if (
        old &&
        activeTickets(old).length &&
        ['movieId', 'versionId', 'roomId', 'date', 'time', 'priceId'].some((k) => out[k] !== old[k])
      )
        return fail('Suất đã bán vé. Không thể thay phim, phòng, thời gian hay bảng giá.')
      if (old && activeTickets(old).length && out.status === 'Đã hủy')
        return fail('Suất đã bán vé không thể hủy trong phạm vi này. Có thể đóng bán.')
    }
    if (['products', 'promotions', 'staff'].includes(type)) {
      out.cinemaIds = f.getAll('cinemaIds')
      if (!out.cinemaIds.length) return fail('Chọn ít nhất một cụm rạp.')
      if (old && old.cinemaIds.some((c) => !allowedCinemas().includes(c)))
        return fail(
          'Bản ghi áp dụng cả cụm rạp ngoài phạm vi phụ trách. Cần quản trị hệ thống sửa.',
        )
    }
    if (type === 'products') {
      out.price = Number(out.price)
      if (!safeURL(out.image)) return fail('Ảnh chỉ dùng assets/ hoặc HTTPS.')
      out.components =
        out.kind === 'Combo'
          ? $$('.component-row', form).map((row) => ({
              productId: $('[data-component-product]', row).value,
              qty: Number($('[data-component-qty]', row).value),
            }))
          : []
      if (out.kind === 'Combo' && !out.components.length)
        return fail('Combo phải có ít nhất một thành phần.')
      if (
        out.components.some((c) =>
          out.cinemaIds.some((cid) => !get('products', c.productId).cinemaIds.includes(cid)),
        )
      )
        return fail('Thành phần combo phải được bán tại mọi cụm rạp đã chọn.')
    }
    if (type === 'promotions') {
      for (const k of ['roomKinds', 'formats', 'categories']) {
        out[k] = f.getAll(k)
        if (!out[k].length) return fail('Chưa chọn đủ loại phòng, định dạng hoặc đối tượng.')
      }
      for (const k of ['value', 'maxDiscount', 'minOrder', 'limit']) out[k] = Number(out[k])
      out.combine = f.has('combine')
      out.code = out.code.toUpperCase()
      if (out.start > out.end) return fail('Ngày kết thúc phải từ ngày bắt đầu trở đi.')
      if (out.mode === 'Phần trăm' && out.value > 100)
        return fail('Phần trăm giảm phải từ 1 đến 100.')
      if (out.roomKinds.some((k) => ['Cao cấp', 'Giường nằm'].includes(k)))
        return fail(
          'Phòng cao cấp và giường nằm không áp dụng ưu đãi theo đối tượng trong mô hình này.',
        )
      if (db.promotions.some((p) => p.id !== id && p.code === out.code))
        return fail('Mã ưu đãi đã tồn tại.')
    }
    if (type === 'staff') {
      if (out.role === 'Quản trị hệ thống') out.cinemaIds = db.cinemas.map((c) => c.id)
      if (db.staff.some((s) => s.id !== id && s.email === out.email))
        return fail('Email tài khoản đã tồn tại.')
      if (
        id === state.employee &&
        (out.status !== 'Hoạt động' || out.role !== 'Quản trị hệ thống') &&
        role() === 'Quản trị hệ thống'
      )
        return fail('Không thể khóa hoặc hạ vai trò tài khoản quản trị đang sử dụng.')
    }
    if (!out.name?.trim() && type !== 'shows') return fail('Tên không được chỉ chứa khoảng trắng.')
    out.id =
      id ||
      {
        movies: 'M',
        cinemas: 'C',
        rooms: 'R',
        shows: 'S',
        products: 'F',
        promotions: 'KM',
        customers: 'U',
        staff: 'E',
      }[type] + Date.now()
    if (id) db[type][db[type].findIndex((x) => x.id === id)] = out
    else db[type].push(out)
    persist(id ? 'Cập nhật ' + titles[type] : 'Tạo ' + titles[type], out.name || out.id)
    closeDialog()
    drawChrome()
    render()
    toast('Đã cập nhật ' + (out.name || out.id) + (storageError ? ' trong phiên hiện tại.' : '.'))
  }
  function detail(type, id) {
    const x = get(type, id)
    if (!x) return
    let body = '',
      foot = ''
    if (type === 'movies')
      body = `<div class="overview-hero"><img class="film-detail-poster" src="${esc(x.poster)}" alt="Poster ${esc(x.name)}"><div><h2>${esc(x.name)}</h2><div class="mini-summary">${status(x.status)}<span class="chip">${x.age}</span><span class="chip">${esc(x.genre)}</span></div><p>${esc(x.description)}</p></div></div><dl class="detail-grid">${detailField('Thời lượng', x.duration + ' phút')}${detailField('Khởi chiếu', date(x.release))}${detailField('Đạo diễn', esc(x.director))}${detailField('Quốc gia', esc(x.country))}${detailField('Diễn viên', esc(x.cast), true)}${detailField('Phiên bản', x.versions.map((v) => v.format + ' · ' + esc(v.language) + ' · ' + esc(v.subtitle)).join('<br>'), true)}</dl>${x.trailer ? `<a class="text-link" href="${esc(x.trailer)}" target="_blank" rel="noopener">Mở trailer ↗</a>` : '<p class="metric-note">Chưa có trailer minh họa.</p>'}`
    if (type === 'cinemas') {
      const rs = db.rooms.filter((r) => r.cinemaId === id)
      body = `<div class="tabs" style="padding:0;margin-bottom:20px">${['Tổng quan', 'Phòng chiếu', 'Tiện ích'].map((n, i) => button(n, 'cinema-detail-tab', id + '|' + i, i === 0 ? 'active' : '')).join('')}</div><div id="cinema-detail-content">${cinemaDetailContent(x, 0)}</div>`
    }
    if (type === 'rooms')
      body = `<dl class="detail-grid">${detailField('Cụm rạp', esc(get('cinemas', x.cinemaId).name))}${detailField('Loại phòng', esc(x.kind))}${detailField('Định dạng', x.formats.join(' / '))}${detailField('Trạng thái', status(x.status))}${detailField('Sức chứa', cap(x) + ' chỗ / ' + units(x) + ' đơn vị đặt chỗ')}${detailField('Công nghệ', esc(x.technology))}</dl>`
    if (type === 'shows') {
      const m = get('movies', x.movieId),
        r = get('rooms', x.roomId),
        v = m.versions.find((v) => v.id === x.versionId)
      body = `<h2>${esc(m.name)}</h2><dl class="detail-grid">${detailField('Cụm rạp', esc(get('cinemas', r.cinemaId).name))}${detailField('Phòng', esc(r.name) + ' · ' + esc(r.kind))}${detailField('Ngày chiếu', date(x.date))}${detailField('Giờ chiếu', x.time + ' – ' + endTime(x))}${detailField('Phiên bản', v.format + ' · ' + esc(v.subtitle))}${detailField('Nghỉ chuẩn bị', x.breakMinutes + ' phút')}${detailField('Bảng giá', esc(get('pricing', x.priceId).name))}${detailField('Ghế đã bán', activeTickets(x).length + ' / ' + units(r) + ' đơn vị')}${detailField('Trạng thái', status(x.status))}</dl>`
    }
    if (type === 'orders') {
      const s = get('shows', x.showId),
        r = get('rooms', s.roomId),
        c = get('customers', x.customerId),
        p = db.payments.find((p) => p.orderId === id)
      body = `<div class="status-summary">${status(x.status)}${status(p?.status || 'Chưa thanh toán')}</div><dl class="detail-grid">${detailField('Khách hàng', esc(c?.name || 'Khách vãng lai'))}${detailField('Liên hệ', esc(c?.phone || '—'))}${detailField('Phim', esc(get('movies', s.movieId).name))}${detailField('Suất chiếu', s.time + ' · ' + date(s.date))}${detailField('Rạp / phòng', esc(get('cinemas', r.cinemaId).name) + ' · ' + esc(r.name), true)}</dl><div class="table-wrap"><table><thead><tr><th>Vé / sản phẩm</th><th>Số lượng / đơn vị</th><th>Giá</th><th>Sử dụng</th></tr></thead><tbody>${x.tickets.map((t) => `<tr><td><b>${t.id}</b><span class="cell-sub">Ghế ${t.seatId} · ${D.seatTypes[t.type].label} · ${esc(t.category)}</span></td><td>1 / ${D.seatTypes[t.type].unit}</td><td>${money(t.price)}</td><td>${status(t.status)}</td></tr>`).join('')}${x.items.map((i) => `<tr><td>${esc(get('products', i.productId)?.name || i.productId)}</td><td>${i.qty}</td><td>${money(i.unitPrice * i.qty)}</td><td>—</td></tr>`).join('')}</tbody></table></div><dl class="detail-grid">${detailField('Tạm tính', money(x.total + x.discount))}${detailField('Giảm giá', money(x.discount))}${detailField('Tổng thanh toán', '<b>' + money(x.total) + '</b>')}${detailField('Mã giao dịch', esc(p?.id || '—'))}</dl><h3>Lịch sử trạng thái</h3><div class="timeline">${x.history.map((h) => `<div class="timeline-item">${esc(h.action)}<small>${stamp(h.at)}</small></div>`).join('')}</div>`
      if (can('operate', 'orders') && x.status === 'Chờ thanh toán')
        foot =
          button('Hủy đơn chưa thanh toán', 'cancel-order', x.id, 'danger') +
          button('Mô phỏng thanh toán', 'pay-order', x.id, 'primary')
      else
        body += `<p class="metric-note">${x.tickets.some((t) => t.status === 'Đã sử dụng') ? 'Đơn có vé đã sử dụng; thao tác hủy bị khóa.' : 'Đơn đã xác nhận hoặc kết thúc. Không có thao tác hoàn vé trong phạm vi này.'}</p>`
    }
    if (type === 'payments') {
      body = `<dl class="detail-grid">${detailField('Đơn đặt vé', x.orderId)}${detailField('Phương thức', x.method)}${detailField('Số tiền', money(x.amount))}${detailField('Trạng thái', status(x.status))}${detailField('Tham chiếu', esc(x.reference))}${detailField('Khởi tạo', stamp(x.createdAt))}${detailField('Cập nhật', stamp(x.updatedAt))}${detailField('Đối chiếu', x.needsReview ? status('Cần kiểm tra') : 'Đã khớp')}</dl><div class="notice info">Thao tác mô phỏng chỉ cập nhật dữ liệu tại trình duyệt; không tạo giao dịch thật.</div>`
      if (can('operate', 'payments')) {
        if (x.status === 'Chờ thanh toán')
          foot =
            button('Đánh dấu thất bại', 'payment-status', id + '|Thất bại') +
            button('Đánh dấu hết hạn', 'payment-status', id + '|Hết hạn') +
            button('Thanh toán thành công', 'payment-status', id + '|Thành công', 'primary')
        if (x.needsReview)
          foot += button('Xác nhận đã đối chiếu', 'reconcile', id, 'primary', 'check')
      }
    }
    if (type === 'products')
      body = `<div class="overview-hero"><img src="${esc(x.image)}" style="width:140px" alt=""><div><h2>${esc(x.name)}</h2><p class="subtitle">${esc(x.description)}</p><p class="money mt">${money(x.price)}</p></div></div><dl class="detail-grid">${detailField('Danh mục', x.kind)}${detailField('Trạng thái', status(x.status))}${detailField('Phạm vi bán', x.cinemaIds.map((id) => esc(get('cinemas', id)?.name)).join('<br>'), true)}${x.components.length ? detailField('Thành phần', x.components.map((c) => c.qty + ' × ' + esc(get('products', c.productId)?.name)).join('<br>'), true) : ''}</dl>`
    if (type === 'promotions')
      body = `<h2>${esc(x.name)} <span class="chip">${esc(x.code)}</span></h2><div class="notice info mt">${esc(promoSummary(x))}</div><dl class="detail-grid">${detailField('Thời gian', date(x.start) + ' – ' + date(x.end))}${detailField('Trạng thái', status(x.status))}${detailField('Phạm vi', x.cinemaIds.map((id) => esc(get('cinemas', id)?.name)).join('<br>'), true)}${detailField('Đối tượng', x.categories.map(esc).join(', '), true)}${detailField('Ghi chú', esc(x.description), true)}</dl>`
    if (type === 'customers') {
      const os = scopedOrders().filter((o) => o.customerId === id),
        pos = os.filter(paid)
      body = `<dl class="detail-grid">${detailField('Họ tên', esc(x.name))}${detailField('Loại khách', status(x.tier))}${detailField('Điện thoại', esc(x.phone))}${detailField('Email', esc(x.email))}${detailField('Chi tiêu trong phạm vi', money(pos.reduce((a, o) => a + o.total, 0)))}${db.settings.membership ? detailField('Điểm từ chi tiêu', x.tier === 'Khách vãng lai' ? 'Không áp dụng' : num(Math.floor(pos.reduce((a, o) => a + o.total, 0) / 10000))) : ''}</dl><h3>Lịch sử đặt vé trong phạm vi</h3><div class="table-wrap"><table><thead><tr><th>Đơn</th><th>Phim</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>${os.map((o) => `<tr><td>${button(o.id, 'order-detail', o.id, 'small ghost')}</td><td>${esc(get('movies', get('shows', o.showId).movieId).name)}</td><td>${money(o.total)}</td><td>${status(o.status)}</td></tr>`).join('')}</tbody></table></div>`
    }
    if (type === 'staff')
      body = `<dl class="detail-grid">${detailField('Nhân viên', esc(x.name))}${detailField('Email', esc(x.email))}${detailField('Vai trò', esc(x.role))}${detailField('Trạng thái', status(x.status))}${detailField('Cụm rạp phụ trách', x.cinemaIds.map((id) => esc(get('cinemas', id)?.name)).join('<br>'), true)}</dl>`
    showDialog(
      type === 'orders'
        ? 'Chi tiết đơn ' + x.id
        : type === 'payments'
          ? 'Chi tiết giao dịch ' + x.id
          : esc(x.name || titles[type]),
      body,
      foot || button('Đóng', 'close'),
      ['orders', 'customers', 'cinemas'].includes(type),
    )
    if (['orders', 'payments', 'customers'].includes(type)) $('#dialog').classList.add('drawer')
  }
  function cinemaDetailContent(c, tab) {
    const rs = db.rooms.filter((r) => r.cinemaId === c.id)
    if (tab === 1)
      return `<div class="table-wrap"><table><thead><tr><th>Phòng</th><th>Loại</th><th>Định dạng</th><th>Sức chứa</th><th>Trạng thái</th></tr></thead><tbody>${rs.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.kind)}</td><td>${r.formats.join(' / ')}</td><td>${cap(r)} chỗ · ${units(r)} đơn vị</td><td>${status(r.status)}</td></tr>`).join('')}</tbody></table>${!rs.length ? empty('Chưa có phòng chiếu') : ''}</div>`
    if (tab === 2)
      return `<h3>Tiện ích tại cụm rạp</h3><div class="mt">${c.amenities
        .split(',')
        .map((s) => `<span class="chip" style="padding:10px 15px">${esc(s.trim())}</span>`)
        .join('')}</div>`
    return `<dl class="detail-grid">${detailField('Tên cụm rạp', esc(c.name))}${detailField('Mã', esc(c.code))}${detailField('Địa chỉ', esc(c.address), true)}${detailField('Liên hệ', esc(c.phone) + '<br>' + esc(c.email))}${detailField('Giờ mở cửa', esc(c.hours))}${detailField('Phòng / sức chứa', rs.length + ' phòng · ' + rs.reduce((a, r) => a + cap(r), 0) + ' chỗ')}${detailField('Trạng thái', status(c.status))}</dl>`
  }
  const pricingDemo = (() => {
    const dialog = document.querySelector('#dialog')
    const main = document.querySelector('#main')
    const esc = (value) =>
      String(value ?? '').replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
      )

    const state = {
      versionId: 'VER-DEMO-02',
      expectedVersion: 2,
      status: 'DRAFT',
      name: 'Bảng giá ngày thường',
      cinemaIds: ['C1'],
      cinemaLabels: ['Lumière Nguyễn Du'],
      roomKinds: ['Tiêu chuẩn'],
      formats: ['2D'],
      effectiveFrom: '2026-10-01',
      effectiveTo: '',
      defaultTicketGroupId: 'TG-ADULT',
      timeBands: [
        { id: 'TB-DAY', name: 'Ban ngày', startTime: '00:00', endTime: '17:00', sortOrder: 10 },
        { id: 'TB-EVENING', name: 'Buổi tối', startTime: '17:00', endTime: '23:59', sortOrder: 20 },
      ],
      ticketGroups: [
        { id: 'TG-ADULT', name: 'Người lớn', unit: 'vé', required: true, sortOrder: 10 },
        { id: 'TG-CHILD', name: 'Trẻ em', unit: 'vé', required: true, sortOrder: 20 },
        {
          id: 'TG-STUDENT',
          name: 'Học sinh, sinh viên',
          unit: 'vé',
          required: false,
          sortOrder: 30,
        },
      ],
      seatTypes: [
        { id: 'STANDARD', name: 'Ghế thường', unit: 'vé' },
        { id: 'VIP', name: 'Ghế VIP', unit: 'vé' },
        { id: 'COUPLE', name: 'Ghế đôi', unit: 'cặp' },
      ],
      cells: [
        {
          timeBandId: 'TB-DAY',
          ticketGroupId: 'TG-ADULT',
          seatTypeId: 'STANDARD',
          status: 'PRICED',
          price: 70000,
        },
        {
          timeBandId: 'TB-DAY',
          ticketGroupId: 'TG-CHILD',
          seatTypeId: 'STANDARD',
          status: 'PRICED',
          price: 50000,
        },
        {
          timeBandId: 'TB-DAY',
          ticketGroupId: 'TG-STUDENT',
          seatTypeId: 'STANDARD',
          status: 'UNCONFIGURED',
          price: null,
        },
        {
          timeBandId: 'TB-EVENING',
          ticketGroupId: 'TG-ADULT',
          seatTypeId: 'STANDARD',
          status: 'PRICED',
          price: 85000,
        },
        {
          timeBandId: 'TB-EVENING',
          ticketGroupId: 'TG-CHILD',
          seatTypeId: 'STANDARD',
          status: 'NOT_APPLICABLE',
          price: null,
        },
        {
          timeBandId: 'TB-EVENING',
          ticketGroupId: 'TG-STUDENT',
          seatTypeId: 'STANDARD',
          status: 'PRICED',
          price: 0,
        },
      ],
    }

    let opener = null
    let saving = false
    let toastTimer = null

    const formatMoney = (value) =>
      value === null || value === undefined || value === ''
        ? ''
        : `${Number(value).toLocaleString('vi-VN')}đ`

    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    const uniqueByName = (items) => {
      const names = items.map((item) => item.name.trim().toLocaleLowerCase('vi'))
      return new Set(names).size === names.length
    }

    const sorted = (items) => [...items].sort((a, b) => a.sortOrder - b.sortOrder)

    function toast(message, kind = 'success') {
      let node = document.querySelector('#pricing-modal-toast')
      if (!node) {
        node = document.createElement('div')
        node.id = 'pricing-modal-toast'
        node.className = 'pricing-toast'
        node.setAttribute('role', 'status')
        node.setAttribute('aria-live', 'polite')
        document.body.append(node)
      }
      node.dataset.kind = kind
      node.textContent = message
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => node.remove(), 4500)
    }

    function setCell(key, updates) {
      const [timeBandId, ticketGroupId, seatTypeId] = key.split('::')
      let cell = state.cells.find(
        (item) =>
          item.timeBandId === timeBandId &&
          item.ticketGroupId === ticketGroupId &&
          item.seatTypeId === seatTypeId,
      )

      if (!cell) {
        cell = { timeBandId, ticketGroupId, seatTypeId, status: 'UNCONFIGURED', price: null }
        state.cells.push(cell)
      }
      Object.assign(cell, updates)
    }

    function getCell(timeBandId, ticketGroupId, seatTypeId) {
      return (
        state.cells.find(
          (cell) =>
            cell.timeBandId === timeBandId &&
            cell.ticketGroupId === ticketGroupId &&
            cell.seatTypeId === seatTypeId,
        ) || { status: 'UNCONFIGURED', price: null }
      )
    }

    function fieldError(fieldId, message) {
      const field = document.getElementById(fieldId)
      const error = document.getElementById(`${fieldId}-error`)
      if (field) {
        field.setAttribute('aria-invalid', 'true')
        field.setAttribute('aria-describedby', `${fieldId}-error`)
      }
      if (error) error.textContent = message
    }

    function clearErrors() {
      dialog.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
        field.removeAttribute('aria-invalid')
        field.removeAttribute('aria-describedby')
      })
      dialog.querySelectorAll('.pricing-field-error').forEach((node) => {
        node.textContent = ''
      })
      const summary = dialog.querySelector('#pricing-error-summary')
      if (summary) summary.textContent = ''
    }

    function renderRows() {
      const bands = sorted(state.timeBands)
      const groups = sorted(state.ticketGroups)

      return bands
        .map(
          (band) => `
          <section class="pricing-band" aria-labelledby="band-title-${esc(band.id)}">
            <div class="pricing-band__heading">
              <div>
                <h3 id="band-title-${esc(band.id)}">${esc(band.name)}</h3>
                <p>${esc(band.startTime)}–${esc(band.endTime)} · Dữ liệu minh họa</p>
              </div>
              <div class="pricing-band__actions" aria-label="Thao tác khung giờ ${esc(band.name)}">
                <button type="button" class="icon-btn" data-pricing-action="move-band-up" data-id="${esc(band.id)}" aria-label="Chuyển ${esc(band.name)} lên">↑</button>
                <button type="button" class="icon-btn" data-pricing-action="move-band-down" data-id="${esc(band.id)}" aria-label="Chuyển ${esc(band.name)} xuống">↓</button>
                <button type="button" class="icon-btn" data-pricing-action="remove-band" data-id="${esc(band.id)}" aria-label="Xóa khung giờ ${esc(band.name)}">×</button>
              </div>
            </div>
            <div class="pricing-table-wrap" role="region" aria-label="Bảng giá ${esc(band.name)}" tabindex="0">
              <table class="pricing-table">
                <thead>
                  <tr>
                    <th scope="col">Hạng ghế / đơn vị</th>
                    ${groups
                      .map(
                        (group) =>
                          `<th scope="col">${esc(group.name)}<small>/${esc(group.unit)}</small></th>`,
                      )
                      .join('')}
                  </tr>
                </thead>
                <tbody>
                  ${state.seatTypes
                    .map(
                      (seat) => `
                      <tr>
                        <th scope="row">${esc(seat.name)}<small>/${esc(seat.unit)}</small></th>
                        ${groups
                          .map((group) => {
                            const cell = getCell(band.id, group.id, seat.id)
                            const key = `${band.id}::${group.id}::${seat.id}`
                            const disabled = state.status !== 'DRAFT' ? 'disabled' : ''
                            const value = cell.price ?? ''
                            const statusOptions = [
                              ['UNCONFIGURED', 'Chưa nhập giá'],
                              ['PRICED', 'Có giá'],
                              ['NOT_APPLICABLE', 'Không áp dụng'],
                            ]

                            return `
                              <td>
                                <label class="pricing-sr-only" for="price-${esc(key)}">
                                  Giá ${esc(seat.name)}, ${esc(group.name)}, ${esc(band.name)}
                                </label>
                                <select data-cell-status="${esc(key)}" ${disabled}>
                                  ${statusOptions
                                    .map(
                                      ([code, label]) =>
                                        `<option value="${code}" ${cell.status === code ? 'selected' : ''}>${label}</option>`,
                                    )
                                    .join('')}
                                </select>
                                <div class="pricing-money-input">
                                  <input
                                    id="price-${esc(key)}"
                                    data-cell-price="${esc(key)}"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    inputmode="numeric"
                                    value="${esc(value)}"
                                    placeholder="Nhập giá"
                                    aria-describedby="unit-${esc(key)}"
                                    ${disabled}
                                  >
                                  <span id="unit-${esc(key)}">đ/${esc(seat.unit)}</span>
                                </div>
                                <p class="pricing-field-error" id="price-${esc(key)}-error"></p>
                              </td>`
                          })
                          .join('')}
                      </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </section>`,
        )
        .join('')
    }

    function render() {
      const readOnly = state.status !== 'DRAFT'
      const canEdit = !readOnly
      const statusLabel = readOnly ? 'Đã phát hành · Chỉ xem' : 'Bản nháp'
      const errors = validate()
      const saveDisabled = readOnly || saving

      dialog.className = 'pricing-dialog'
      dialog.innerHTML = `
      <header class="dialog-head pricing-dialog__head">
        <div>
          <p class="pricing-eyebrow">DỮ LIỆU MINH HỌA · ${esc(state.versionId)}</p>
          <h2 id="dialog-title">Thiết lập bảng giá</h2>
          <p class="pricing-dialog__name">${esc(state.name)} <span class="pricing-status ${readOnly ? 'is-published' : 'is-draft'}">${statusLabel}</span></p>
        </div>
        <button type="button" class="icon-btn ghost" data-pricing-action="close" aria-label="Đóng thiết lập bảng giá">×</button>
      </header>
      <div class="pricing-dialog__content">
        <div class="pricing-columns">
          <section class="pricing-card">
            <div class="pricing-card__title"><span class="pricing-step">01</span><div><h3>Phạm vi áp dụng</h3><p>Chỉ hiển thị cấu hình mẫu hợp lệ.</p></div></div>
            <div class="pricing-form-grid">
              <label class="pricing-field">Tên bảng giá<input id="pricing-name" value="${esc(state.name)}" ${canEdit ? '' : 'disabled'}><small class="pricing-field-error" id="pricing-name-error"></small></label>
              <label class="pricing-field">Cụm rạp<select disabled>${state.cinemaLabels.map((label) => `<option selected>${esc(label)}</option>`).join('')}</select><small>Phạm vi mẫu được khóa.</small></label>
              <label class="pricing-field">Loại phòng<select disabled>${state.roomKinds.map((kind) => `<option selected>${esc(kind)}</option>`).join('')}</select></label>
              <label class="pricing-field">Định dạng<select disabled>${state.formats.map((format) => `<option selected>${esc(format)}</option>`).join('')}</select></label>
              <label class="pricing-field">Hiệu lực từ<input type="date" value="${esc(state.effectiveFrom)}" ${canEdit ? '' : 'disabled'}></label>
              <label class="pricing-field">Hiệu lực đến<input type="date" value="${esc(state.effectiveTo)}" ${canEdit ? '' : 'disabled'}><small>Để trống nếu chưa đặt ngày kết thúc.</small></label>
            </div>
          </section>
          <section class="pricing-card">
            <div class="pricing-card__title"><span class="pricing-step">02</span><div><h3>Khung giờ</h3><p>Tên và giờ áp dụng lấy từ cấu hình.</p></div></div>
            ${bandsEditor(canEdit)}
            <button type="button" class="secondary" data-pricing-action="add-band" ${canEdit ? '' : 'disabled'}>＋ Thêm khung giờ</button>
          </section>
          <section class="pricing-card pricing-card--wide">
            <div class="pricing-card__title"><span class="pricing-step">03</span><div><h3>Nhóm vé và bảng giá</h3><p>Ô giá được xác định bằng ID khung giờ, nhóm vé và hạng ghế.</p></div></div>
            ${groupsEditor(canEdit)}
            ${renderRows()}
            <button type="button" class="secondary" data-pricing-action="add-group" ${canEdit ? '' : 'disabled'}>＋ Thêm nhóm vé</button>
            <div class="pricing-legend"><span><i class="is-empty"></i>Chưa nhập giá</span><span><i class="is-na"></i>Không áp dụng</span><span><i class="is-zero"></i>0đ là giá hợp lệ</span></div>
            <div class="pricing-error-summary" id="pricing-error-summary" role="alert">${errors.length ? errors.map(esc).join(' · ') : ''}</div>
          </section>
          <details class="pricing-contract pricing-card pricing-card--wide">
            <summary>Payload cấu hình minh họa</summary>
            <pre><code>${esc(JSON.stringify(buildPayload(), null, 2))}</code></pre>
          </details>
          <div class="pricing-demo-controls pricing-card pricing-card--wide">
            <strong>Trạng thái demo</strong>
            <button type="button" class="secondary" data-pricing-action="demo-success">Minh họa lưu thành công</button>
            <button type="button" class="secondary" data-pricing-action="demo-validation">Minh họa lỗi nhập</button>
            <button type="button" class="secondary" data-pricing-action="demo-conflict">Minh họa HTTP 409</button>
            <span>Dữ liệu minh họa · Không gọi backend</span>
          </div>
        </div>
      </div>
      <footer class="dialog-foot pricing-dialog__foot">
        <span>${errors.length ? `${errors.length} lỗi cần xử lý` : 'Cấu hình sẵn sàng kiểm tra'}</span>
        <div>
          <button type="button" data-pricing-action="cancel">Hủy</button>
          <button type="button" class="primary" data-pricing-action="save" ${saveDisabled ? 'disabled' : ''}>${saving ? 'Đang lưu…' : 'Lưu bảng giá'}</button>
        </div>
      </footer>`
      dialog.setAttribute('aria-labelledby', 'dialog-title')
      dialog.setAttribute('aria-describedby', 'pricing-error-summary')
      if (!dialog.open) dialog.showModal()
      dialog.querySelector('[data-pricing-action="close"]')?.focus()
    }

    function bandsEditor(canEdit) {
      return `<div class="pricing-config-list">${sorted(state.timeBands)
        .map(
          (band, index) => `
        <div class="pricing-config-row">
          <label class="pricing-field">Tên khung giờ<input data-band-name="${esc(band.id)}" value="${esc(band.name)}" ${canEdit ? '' : 'disabled'}></label>
          <label class="pricing-field">Bắt đầu<input type="time" data-band-start="${esc(band.id)}" value="${esc(band.startTime)}" ${canEdit ? '' : 'disabled'}></label>
          <label class="pricing-field">Kết thúc<input type="time" data-band-end="${esc(band.id)}" value="${esc(band.endTime)}" ${canEdit ? '' : 'disabled'}></label>
          <div class="pricing-config-actions">
            <button type="button" data-pricing-action="move-band-up" data-id="${esc(band.id)}" aria-label="Chuyển ${esc(band.name)} lên" ${index === 0 || !canEdit ? 'disabled' : ''}>↑</button>
            <button type="button" data-pricing-action="move-band-down" data-id="${esc(band.id)}" aria-label="Chuyển ${esc(band.name)} xuống" ${index === state.timeBands.length - 1 || !canEdit ? 'disabled' : ''}>↓</button>
            <button type="button" data-pricing-action="remove-band" data-id="${esc(band.id)}" aria-label="Xóa khung giờ ${esc(band.name)}" ${!canEdit ? 'disabled' : ''}>Xóa</button>
          </div>
          <small class="pricing-field-error" data-band-error="${esc(band.id)}"></small>
        </div>`,
        )
        .join('')}</div>`
    }

    function groupsEditor(canEdit) {
      return `<div class="pricing-config-list">${sorted(state.ticketGroups)
        .map(
          (group, index) => `
        <div class="pricing-config-row pricing-config-row--group">
          <label class="pricing-field">Tên nhóm vé<input data-group-name="${esc(group.id)}" value="${esc(group.name)}" ${canEdit ? '' : 'disabled'}></label>
          <label class="pricing-field">Đơn vị<input data-group-unit="${esc(group.id)}" value="${esc(group.unit)}" ${canEdit ? '' : 'disabled'}></label>
          <label class="pricing-field pricing-required"><input type="checkbox" data-group-required="${esc(group.id)}" ${group.required ? 'checked' : ''} ${canEdit ? '' : 'disabled'}>Giá bắt buộc</label>
          <div class="pricing-config-actions">
            <button type="button" data-pricing-action="move-group-up" data-id="${esc(group.id)}" aria-label="Chuyển ${esc(group.name)} lên" ${index === 0 || !canEdit ? 'disabled' : ''}>↑</button>
            <button type="button" data-pricing-action="move-group-down" data-id="${esc(group.id)}" aria-label="Chuyển ${esc(group.name)} xuống" ${index === state.ticketGroups.length - 1 || !canEdit ? 'disabled' : ''}>↓</button>
            <button type="button" data-pricing-action="remove-group" data-id="${esc(group.id)}" aria-label="Xóa nhóm vé ${esc(group.name)}" ${!canEdit ? 'disabled' : ''}>Xóa</button>
          </div>
          <small class="pricing-field-error" data-group-error="${esc(group.id)}"></small>
        </div>`,
        )
        .join('')}</div>`
    }

    function validate() {
      const errors = []
      if (!state.name.trim()) errors.push('Nhập tên bảng giá.')
      if (!uniqueByName(state.timeBands)) errors.push('Tên khung giờ không được trùng.')
      if (!uniqueByName(state.ticketGroups)) errors.push('Tên nhóm vé không được trùng.')

      for (const band of state.timeBands) {
        if (!band.name.trim()) errors.push('Tên khung giờ không được để trống.')
        if (timeToMinutes(band.startTime) >= timeToMinutes(band.endTime)) {
          errors.push(`Khung giờ “${band.name || 'Chưa đặt tên'}” có thời gian không hợp lệ.`)
        }
      }

      const chronological = [...state.timeBands].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
      )
      for (let index = 1; index < chronological.length; index += 1) {
        if (
          timeToMinutes(chronological[index].startTime) <
          timeToMinutes(chronological[index - 1].endTime)
        ) {
          errors.push(
            `Khung giờ “${chronological[index - 1].name}” và “${chronological[index].name}” bị chồng lấn.`,
          )
        }
      }

      for (const band of state.timeBands) {
        for (const seat of state.seatTypes) {
          for (const group of state.ticketGroups.filter((item) => item.required)) {
            const cell = getCell(band.id, group.id, seat.id)
            if (
              cell.status === 'UNCONFIGURED' ||
              (cell.status === 'PRICED' && cell.price === null)
            ) {
              errors.push(`Thiếu giá bắt buộc: ${band.name} · ${seat.name} · ${group.name}.`)
            }
          }
        }
      }
      return errors
    }

    function buildPayload() {
      return {
        expectedVersion: state.expectedVersion,
        timeBands: sorted(state.timeBands).map(({ id, name, startTime, endTime, sortOrder }) => ({
          id: id.startsWith('NEW-') ? null : id,
          name,
          startTime,
          endTime,
          sortOrder,
        })),
        ticketGroups: sorted(state.ticketGroups).map(({ id, name, unit, required, sortOrder }) => ({
          id: id.startsWith('NEW-') ? null : id,
          name,
          unit,
          required,
          sortOrder,
        })),
        cells: state.cells.map(({ timeBandId, ticketGroupId, seatTypeId, status, price }) => ({
          timeBandId,
          ticketGroupId,
          seatTypeId,
          status,
          price,
        })),
      }
    }

    function move(items, id, direction) {
      const list = sorted(items)
      const index = list.findIndex((item) => item.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= list.length) return
      ;[list[index], list[target]] = [list[target], list[index]]
      list.forEach((item, position) => {
        item.sortOrder = (position + 1) * 10
      })
    }

    function removeBand(id) {
      state.timeBands = state.timeBands.filter((item) => item.id !== id)
      state.cells = state.cells.filter((cell) => cell.timeBandId !== id)
    }

    function removeGroup(id) {
      if (state.defaultTicketGroupId === id) {
        toast('Đặt nhóm vé mặc định khác trước khi xóa nhóm này.', 'error')
        return
      }
      state.ticketGroups = state.ticketGroups.filter((item) => item.id !== id)
      state.cells = state.cells.filter((cell) => cell.ticketGroupId !== id)
    }

    function nextId(prefix) {
      return `NEW-${prefix}-${crypto.randomUUID()}`
    }

    async function simulateSave() {
      clearErrors()
      const errors = validate()
      if (errors.length) {
        dialog.querySelector('#pricing-error-summary').textContent = errors[0]
        dialog.querySelector('#pricing-error-summary').focus()
        return
      }
      saving = true
      render()
      await new Promise((resolve) => setTimeout(resolve, 450))
      saving = false
      state.expectedVersion += 1
      state.versionId = `VER-DEMO-${String(state.expectedVersion).padStart(2, '0')}`
      toast('Đã lưu cấu hình minh họa. Backend chưa được gọi.')
      render()
    }

    function open(button) {
      opener = button || document.activeElement
      render()
    }

    function close() {
      if (dialog.open) dialog.close()
    }

    dialog.addEventListener('close', () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    })

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      close()
    })

    dialog.addEventListener('input', (event) => {
      const target = event.target
      if (state.status !== 'DRAFT') return

      if (target.id === 'pricing-name') state.name = target.value
      if (target.matches('[data-band-name]')) {
        const band = state.timeBands.find((item) => item.id === target.dataset.bandName)
        if (band) band.name = target.value
      }
      if (target.matches('[data-band-start]')) {
        const band = state.timeBands.find((item) => item.id === target.dataset.bandStart)
        if (band) band.startTime = target.value
      }
      if (target.matches('[data-band-end]')) {
        const band = state.timeBands.find((item) => item.id === target.dataset.bandEnd)
        if (band) band.endTime = target.value
      }
      if (target.matches('[data-group-name]')) {
        const group = state.ticketGroups.find((item) => item.id === target.dataset.groupName)
        if (group) group.name = target.value
      }
      if (target.matches('[data-group-unit]')) {
        const group = state.ticketGroups.find((item) => item.id === target.dataset.groupUnit)
        if (group) group.unit = target.value
      }
      if (target.matches('[data-cell-price]')) {
        const key = target.dataset.cellPrice
        setCell(key, {
          status: 'PRICED',
          price: target.value === '' ? null : Number(target.value),
        })
      }
      if (target.matches('[data-cell-status]')) {
        const key = target.dataset.cellStatus
        setCell(key, {
          status: target.value,
          price: target.value === 'PRICED' ? getCell(...key.split('::')).price : null,
        })
      }
    })

    dialog.addEventListener('change', (event) => {
      const target = event.target
      if (target.matches('[data-group-required]')) {
        const group = state.ticketGroups.find((item) => item.id === target.dataset.groupRequired)
        if (group) group.required = target.checked
      }
      if (target.matches('[data-cell-status]')) {
        render()
      }
      if (target.matches('[data-group-required]')) {
        render()
      }
    })

    dialog.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-pricing-action]')
      if (!button || button.disabled) return
      const { pricingAction: action, id } = button.dataset

      if (action === 'close' || action === 'cancel') return close()
      if (action === 'save') return simulateSave()
      if (action === 'add-band') {
        state.timeBands.push({
          id: nextId('TB'),
          name: '',
          startTime: '18:00',
          endTime: '23:59',
          sortOrder: (state.timeBands.length + 1) * 10,
        })
        return render()
      }
      if (action === 'add-group') {
        state.ticketGroups.push({
          id: nextId('TG'),
          name: '',
          unit: 'vé',
          required: false,
          sortOrder: (state.ticketGroups.length + 1) * 10,
        })
        return render()
      }
      if (action === 'remove-band') removeBand(id)
      if (action === 'remove-group') removeGroup(id)
      if (action === 'move-band-up') move(state.timeBands, id, -1)
      if (action === 'move-band-down') move(state.timeBands, id, 1)
      if (action === 'move-group-up') move(state.ticketGroups, id, -1)
      if (action === 'move-group-down') move(state.ticketGroups, id, 1)

      if (action === 'demo-success') {
        state.status = 'DRAFT'
        return simulateSave()
      }
      if (action === 'demo-validation') {
        state.timeBands[0].name = state.timeBands[1]?.name || ''
        return render()
      }
      if (action === 'demo-conflict') {
        toast(
          'HTTP 409: dữ liệu đã thay đổi. Hãy tải lại ma trận trước khi lưu; không tự ghi đè.',
          'error',
        )
        return
      }

      render()
    })

    main.addEventListener(
      'click',
      (event) => {
        const button = event.target.closest('[data-action="new-price"], [data-action="edit-price"]')
        if (!button) return
        event.preventDefault()
        event.stopImmediatePropagation()
        open(button)
      },
      true,
    )

    return { open }
  })()
  function priceCalculator(p) {
    return `<div class="form-grid" id="price-calculator" data-table-id="${esc(p.id || 'wizard')}">${select(
      'quote-cinema',
      'Cụm rạp',
      p.cinemaIds.map((id) => [id, get('cinemas', id).name]),
      p.cinemaIds[0],
    )}${select('quote-kind', 'Loại phòng', p.roomKinds, p.roomKinds[0])}${select('quote-format', 'Định dạng', p.formats, p.formats[0])}${field('quote-time', 'Giờ bắt đầu', '17:00', 'time', 'required')}${select(
      'quote-seat',
      'Hạng ghế',
      Object.entries(D.seatTypes)
        .filter(([k, v]) => v.capacity)
        .map(([k, v]) => [k, v.label]),
      'STANDARD',
    )}${select('quote-category', 'Đối tượng vé', D.categories, D.categories[0])}</div><div id="price-quote" class="price-explain" aria-live="polite"></div>`
  }
  function updatePriceQuote(p) {
    const c = $('#price-calculator')
    if (!c) return
    const v = (n) => $(`[name="quote-${n}"]`, c).value,
      time = v('time'),
      type = v('seat'),
      cat = v('category'),
      key = [v('format'), time >= '17:00' ? 'after' : 'before', type, cat].join('|'),
      price = p.prices[key]
    const rooms = db.rooms.filter((r) => r.cinemaId === v('cinema') && r.kind === v('kind'))
    const supported = rooms.some(
      (r) => r.formats.includes(v('format')) && r.seats.some((s) => s.type === type),
    )
    $('#price-quote').innerHTML =
      `<p class="metric-note">${esc(p.name)} · ${p.dayType} · ${time >= '17:00' ? 'Từ 17:00' : 'Trước 17:00'}</p><p style="margin:8px 0"><strong>${!supported ? 'Không có tổ hợp phòng phù hợp' : price === 'NA' ? 'Không áp dụng' : price === '' || price === undefined ? 'Chưa nhập giá' : money(price)}</strong>${supported && typeof price === 'number' ? ` <span class="price-unit">/${D.seatTypes[type].unit}</span>` : ''}</p><p class="metric-note">${supported ? `${esc(v('format'))} · ${D.seatTypes[type].label} · ${esc(cat)}. Giá bán cuối cùng theo bảng; không cộng phụ thu. ${typeof price === 'number' && price === 0 ? 'Giá bằng 0 được hiểu là miễn phí.' : ''}` : 'Cụm rạp chưa có phòng đồng thời hỗ trợ loại phòng, định dạng và hạng ghế này.'}</p>`
  }
  function previewPrice(id) {
    const p = get('pricing', id)
    showDialog(
      'Tra cứu giá vé',
      `<div class="notice info">${esc(p.description || 'Bảng giá được chọn trực tiếp theo suất chiếu.')} Giá và chính sách là dữ liệu minh họa.</div>${priceCalculator(p)}`,
      button('Đóng', 'close'),
      true,
    )
    updatePriceQuote(p)
  }
  function newOrder() {
    if (!guard('operate', 'orders')) return
    const ss = scopedShows()
      .filter(
        (s) =>
          s.date >= D.day() &&
          s.status === 'Mở bán' &&
          get('rooms', s.roomId).status === 'Hoạt động',
      )
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    if (!ss.length) {
      toast('Không có suất đang mở bán trong phạm vi này.', true)
      return
    }
    orderDraft = {
      showId: ss[0].id,
    }
    showDialog(
      'Tạo đơn tại quầy',
      `<div class="notice info">Đặt vé và thanh toán được mô phỏng. Giá được chụp lại tại thời điểm tạo đơn.</div><form id="order-form"><div id="form-errors" role="alert"></div><div class="form-grid">${select(
        'showId',
        'Suất chiếu *',
        ss.map((s) => [
          s.id,
          get('movies', s.movieId).name +
            ' · ' +
            s.time +
            ' ' +
            date(s.date) +
            ' · ' +
            get('cinemas', showCinema(s)).name.replace('Lumière ', '') +
            ' / ' +
            get('rooms', s.roomId).name,
        ]),
        ss[0].id,
        true,
      )}${select(
        'customerId',
        'Khách hàng',
        db.customers.map((c) => [c.id, c.name + ' · ' + c.phone]),
        'U1',
      )}${select('category', 'Đối tượng vé', D.categories, D.categories[0])}<div id="order-seats" class="full"></div><div id="order-food" class="full"></div>${field('promoCode', 'Mã khuyến mãi (nếu có)', '', 'text', '', true)}<div class="full" id="order-quote"></div></div></form>`,
      button('Hủy', 'close') +
        '<button class="primary" type="submit" form="order-form">Tạo đơn chờ thanh toán</button>',
      true,
    )
    renderOrderSeats()
    updateOrderQuote()
  }
  function occupied(s) {
    return new Set(
      db.orders
        .filter(
          (o) =>
            o.showId === s.id &&
            o.status !== 'Đã hủy' &&
            (!o.expiresAt || new Date(o.expiresAt) > new Date() || paid(o)),
        )
        .flatMap((o) => o.tickets.filter((t) => t.status !== 'Đã hủy').map((t) => t.seatId)),
    )
  }
  function renderOrderSeats() {
    const f = $('#order-form'),
      s = get('shows', f.elements.showId.value),
      r = get('rooms', s.roomId),
      taken = occupied(s)
    orderDraft.showId = s.id
    $('#order-seats').innerHTML =
      `<h3>Chọn vị trí đặt chỗ</h3><p class="subtitle">${r.name} · Giá theo bảng ${esc(get('pricing', s.priceId).name)} · Ghế đã đặt được khóa</p><div class="seat-stage"><div class="screen">MÀN HÌNH</div>${[
        ...new Set(r.seats.map((t) => t.row)),
      ]
        .map(
          (row) =>
            `<div class="seat-row"><span class="row-label">${row}</span>${r.seats
              .filter((t) => t.row === row)
              .map((t) =>
                D.seatTypes[t.type].capacity
                  ? `<label class="seat ${t.type}" style="display:grid;place-items:center;opacity:${taken.has(t.id) ? 0.35 : 1}"><input type="checkbox" name="seatIds" value="${t.id}" ${taken.has(t.id) ? 'disabled' : ''} aria-label="Ghế ${t.id}, ${D.seatTypes[t.type].label}" style="width:11px;height:11px;margin:0;accent-color:var(--accent)"><span style="font-size:8px">${t.id}</span></label>`
                  : `<span class="seat ${t.type}" style="border:0;display:grid;place-items:center">·</span>`,
              )
              .join('')}</div>`,
        )
        .join('')}</div><div class="seat-legend">${Object.entries(D.seatTypes)
        .filter(([k, v]) => v.capacity)
        .map(([k, v]) => `<span>${v.label}: /${v.unit} · ${v.capacity} chỗ</span>`)
        .join('')}</div>`
    $('#order-food').innerHTML =
      `<h3 class="mb">Đồ ăn & combo</h3><div class="form-grid">${db.products
        .filter((p) => p.status === 'Đang bán' && p.cinemaIds.includes(r.cinemaId))
        .map((p) =>
          field(
            'food-' + p.id,
            esc(p.name) + ' · ' + money(p.price),
            0,
            'number',
            'min="0" max="20" step="1"',
          ),
        )
        .join('')}</div>`
  }
  function orderQuote() {
    const f = $('#order-form'),
      fd = new FormData(f),
      s = get('shows', fd.get('showId')),
      r = get('rooms', s.roomId),
      m = get('movies', s.movieId),
      version = m.versions.find((v) => v.id === s.versionId),
      p = get('pricing', s.priceId),
      category = fd.get('category'),
      seatIds = fd.getAll('seatIds'),
      tickets = [],
      errors = []
    for (const seatId of seatIds) {
      const seat = r.seats.find((t) => t.id === seatId),
        price =
          p.prices[
            [version.format, s.time >= '17:00' ? 'after' : 'before', seat.type, category].join('|')
          ]
      if (typeof price !== 'number')
        errors.push(
          'Ghế ' +
            seatId +
            ': ' +
            (price === 'NA' ? 'không áp dụng đối tượng đã chọn' : 'chưa nhập giá'),
        )
      else
        tickets.push({
          seatId,
          type: seat.type,
          category,
          price,
          status: 'Chưa sử dụng',
        })
    }
    const items = db.products
      .filter((p) => Number(fd.get('food-' + p.id)) > 0)
      .map((p) => ({
        productId: p.id,
        qty: Number(fd.get('food-' + p.id)),
        unitPrice: p.price,
      }))
    let subtotal =
        tickets.reduce((a, t) => a + t.price, 0) +
        items.reduce((a, i) => a + i.unitPrice * i.qty, 0),
      discount = 0,
      promoId = null
    const code = String(fd.get('promoCode') || '')
      .trim()
      .toUpperCase()
    if (code) {
      const promo = db.promotions.find((p) => p.code === code)
      if (!promo) errors.push('Mã khuyến mãi không tồn tại.')
      else {
        const used = db.orders.filter((o) => o.promoId === promo.id && o.status !== 'Đã hủy').length
        if (
          promo.status !== 'Đang áp dụng' ||
          D.day() < promo.start ||
          D.day() > promo.end ||
          !promo.cinemaIds.includes(r.cinemaId) ||
          !promo.roomKinds.includes(r.kind) ||
          !promo.formats.includes(version.format) ||
          !promo.categories.includes(category) ||
          subtotal < promo.minOrder ||
          used >= promo.limit ||
          ['Cao cấp', 'Giường nằm'].includes(r.kind)
        )
          errors.push('Đơn chưa đáp ứng điều kiện ưu đãi: ' + promoSummary(promo))
        else {
          discount =
            promo.mode === 'Phần trăm' ? Math.floor((subtotal * promo.value) / 100) : promo.value
          if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount)
          discount = Math.min(discount, subtotal)
          promoId = promo.id
        }
      }
    }
    return {
      s,
      r,
      tickets,
      items,
      subtotal,
      discount,
      promoId,
      total: subtotal - discount,
      customerId: fd.get('customerId'),
      errors,
    }
  }
  function updateOrderQuote() {
    if (!$('#order-form')) return
    const q = orderQuote()
    $('#order-quote').innerHTML =
      `${q.errors.length ? `<div class="notice error">${q.errors.map(esc).join('<br>')}</div>` : ''}<div class="price-explain"><div class="mini-summary">${q.tickets.length} đơn vị đặt chỗ · ${q.tickets.reduce((a, t) => a + D.seatTypes[t.type].capacity, 0)} chỗ ngồi · Đồ ăn ${money(q.items.reduce((a, i) => a + i.qty * i.unitPrice, 0))}</div><div class="performance-line"><span>Tạm tính: ${money(q.subtotal)}</span><span>Giảm: ${money(q.discount)}</span></div><strong>${money(q.total)}</strong><p class="metric-note">Giữ ghế ${db.settings.holdMinutes} phút. Giá vé được lưu riêng theo từng vị trí.</p></div>`
  }
  function createOrder(form) {
    if (!guard('operate', 'orders')) return
    const q = orderQuote()
    if (!q.tickets.length) return formError('Chọn ít nhất một vị trí đặt chỗ.')
    if (q.errors.length) return formError(q.errors.join(' '))
    if (q.tickets.some((t) => occupied(q.s).has(t.seatId)))
      return formError('Một vị trí vừa được đặt. Hãy chọn lại ghế.')
    if (showErrors(q.s, q.s.id).length)
      return formError('Suất chiếu không còn đủ điều kiện mở bán.')
    const id = 'DH' + Date.now(),
      at = new Date().toISOString(),
      o = {
        id,
        showId: q.s.id,
        customerId: q.customerId,
        tickets: q.tickets.map((t, i) => ({
          ...t,
          id: 'VE' + Date.now() + '-' + (i + 1),
        })),
        items: q.items,
        discount: q.discount,
        promoId: q.promoId,
        total: q.total,
        status: 'Chờ thanh toán',
        createdAt: at,
        expiresAt: new Date(Date.now() + db.settings.holdMinutes * 60000).toISOString(),
        history: [
          {
            at,
            action: 'Tạo đơn tại quầy · giữ ghế ' + db.settings.holdMinutes + ' phút',
          },
        ],
      }
    db.orders.push(o)
    db.payments.push({
      id: 'GD' + Date.now(),
      orderId: id,
      method: 'Tiền mặt',
      status: 'Chờ thanh toán',
      amount: o.total,
      reference: 'LM' + Date.now(),
      createdAt: at,
      updatedAt: at,
      needsReview: false,
    })
    persist('Tạo đơn tại quầy', id)
    render()
    detail('orders', id)
    toast('Đã tạo đơn và giữ ghế. Có thể mô phỏng thanh toán trong chi tiết đơn.')
  }
  function setPayment(id, next) {
    if (!guard('operate', 'payments')) return
    const p = get('payments', id),
      o = get('orders', p.orderId)
    if (p.status !== 'Chờ thanh toán') {
      toast('Giao dịch đã kết thúc.', true)
      return
    }
    if (o.status !== 'Chờ thanh toán') {
      toast('Đơn không còn ở trạng thái chờ thanh toán.', true)
      return
    }
    if (o.expiresAt && new Date(o.expiresAt) < new Date()) next = 'Hết hạn'
    const at = new Date().toISOString()
    p.status = next
    p.updatedAt = at
    o.status = next === 'Thành công' ? 'Đã xác nhận' : 'Đã hủy'
    if (next !== 'Thành công') o.tickets.forEach((t) => (t.status = 'Đã hủy'))
    o.history.push({
      at,
      action: next === 'Thành công' ? 'Thanh toán thành công (mô phỏng)' : 'Kết thúc đơn: ' + next,
    })
    persist('Cập nhật thanh toán mô phỏng', id + ' · ' + next)
    closeDialog()
    drawChrome()
    render()
    toast('Đã cập nhật: ' + next + '.')
  }
  function expireOrders() {
    let changed = false
    const now = Date.now()
    for (const o of db.orders) {
      if (o.status === 'Chờ thanh toán' && o.expiresAt && new Date(o.expiresAt).getTime() < now) {
        o.status = 'Đã hủy'
        o.tickets.forEach((t) => (t.status = 'Đã hủy'))
        const p = db.payments.find((p) => p.orderId === o.id)
        if (p && p.status === 'Chờ thanh toán') {
          p.status = 'Hết hạn'
          p.updatedAt = new Date().toISOString()
        }
        o.history.push({
          at: new Date().toISOString(),
          action: 'Hết thời gian giữ ghế',
        })
        changed = true
      }
    }
    if (changed) {
      persist('Tự động hết hạn giữ ghế', 'Đơn chờ thanh toán')
      if (!$('#dialog').open) {
        drawChrome()
        render()
      }
    }
  }
  function exportCSV() {
    const group = state.filter.group || 'date',
      rows = aggregate(metrics(), group),
      csvCell = (v) =>
        '"' +
        String(v ?? '')
          .replace(/^[=+@-]/, "'$&")
          .replace(/"/g, '""') +
        '"'
    const csv =
      '\uFEFF' +
      [
        [
          'Nhóm báo cáo',
          'Vé bán (đơn vị)',
          'Lấp đầy (%)',
          'Doanh thu đồ ăn (VNĐ)',
          'Giảm giá (VNĐ)',
          'Thực thu (VNĐ)',
        ],
        ...rows.map((r) => [
          group === 'date' ? date(r.key) : r.key,
          r.tickets,
          r.capacity ? ((r.seats / r.capacity) * 100).toFixed(2) : 0,
          r.food,
          r.discount,
          r.revenue,
        ]),
      ]
        .map((row) => row.map(csvCell).join(','))
        .join('\r\n')
    const link = document.createElement('a'),
      url = URL.createObjectURL(
        new Blob([csv], {
          type: 'text/csv;charset=utf-8;',
        }),
      )
    link.href = url
    link.download = 'lumiere-bao-cao-' + state.rangeStart + '-' + state.rangeEnd + '.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    persist('Xuất báo cáo CSV', scopeLabel() + ' · ' + state.rangeStart + ' – ' + state.rangeEnd)
    toast('Đã xuất CSV theo kỳ và phạm vi đang chọn.')
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]')
    if (!b || b.disabled) return
    const a = b.dataset.action,
      id = b.dataset.id || '',
      page = current()
    if (a === 'sidebar') {
      if (innerWidth <= 1000) document.body.classList.toggle('mobile-open')
      else document.body.classList.toggle('collapsed')
      return
    }
    if (a === 'close') return closeDialog()
    if (a === 'page') {
      state.page = Number(id)
      render()
      return
    }
    if (a === 'clear') {
      state.q = ''
      state.filter = {}
      state.page = 1
      render()
      return
    }
    if (a === 'tab') {
      state.tab = id
      state.page = 1
      state.q = ''
      state.filter = {}
      render()
      return
    }
    if (a === 'view') {
      state.view = id
      render()
      return
    }
    if (a === 'new') return entityForm(page)
    if (a === 'edit') return entityForm(page, id)
    if (a === 'detail') return detail(page, id)
    if (a === 'order-detail') return detail('orders', id)
    if (a === 'add-version') {
      $('#versions').insertAdjacentHTML(
        'beforeend',
        versionRow({
          id: 'V' + Date.now(),
        }),
      )
      return
    }
    if (a === 'remove-version') {
      b.closest('.version-row').remove()
      return
    }
    if (a === 'add-component') {
      $('#components').insertAdjacentHTML('beforeend', componentRow())
      return
    }
    if (a === 'remove-component') {
      b.closest('.component-row').remove()
      return
    }
    if (a === 'copy-show') {
      const original = get('shows', id)
      entityForm('shows', id, true)
      $('#dialog-title').textContent = 'Sao chép suất chiếu'
      const d = new Date(original.date + 'T12:00:00+07:00')
      d.setDate(d.getDate() + 1)
      $('#entity-form').elements.date.value = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)
      updateShowHints()
      return
    }
    if (a === 'seats') {
      state.roomId = id
      state.tab = 'seats'
      state.selectedSeats.clear()
      render()
      return
    }
    if (a === 'seat') {
      if (!guard('edit', 'rooms')) return
      if (state.selectedSeats.has(id)) state.selectedSeats.delete(id)
      else state.selectedSeats.add(id)
      const scroll = $('.seat-stage')?.scrollLeft || 0
      render()
      $('.seat-stage').scrollLeft = scroll
      return
    }
    if (a === 'clear-seats') {
      state.selectedSeats.clear()
      render()
      return
    }
    if (a === 'select-row') {
      const r = get('rooms', state.roomId),
        rows = [...new Set(r.seats.filter((s) => state.selectedSeats.has(s.id)).map((s) => s.row))]
      if (!rows.length) {
        toast('Chọn một vị trí trong hàng trước.', true)
        return
      }
      r.seats.filter((s) => rows.includes(s.row)).forEach((s) => state.selectedSeats.add(s.id))
      render()
      return
    }
    if (a === 'apply-seats') {
      if (!guard('edit', 'rooms')) return
      const r = get('rooms', state.roomId)
      if (!state.selectedSeats.size) {
        toast('Chọn ít nhất một vị trí.', true)
        return
      }
      const ss = db.shows.filter((s) => s.roomId === r.id && s.status !== 'Đã hủy')
      if (
        ss.some((s) => s.status === 'Mở bán') ||
        ss.some((s) => db.orders.some((o) => o.showId === s.id && o.status !== 'Đã hủy'))
      ) {
        toast(
          'Sơ đồ bị khóa vì có suất mở bán hoặc có vé đã đặt. Hãy dùng phòng mới để thử chỉnh ghế.',
          true,
        )
        return
      }
      const next = $('#seat-type').value
      for (const seat of r.seats) if (state.selectedSeats.has(seat.id)) seat.type = next
      persist(
        'Chỉnh sơ đồ ghế',
        get('cinemas', r.cinemaId).name +
          ' / ' +
          r.name +
          ' · ' +
          state.selectedSeats.size +
          ' vị trí',
      )
      state.selectedSeats.clear()
      render()
      toast('Đã cập nhật sơ đồ ghế.')
      return
    }
    if (a === 'new-price') return startWizard()
    if (a === 'edit-price') return startWizard(id)
    if (a === 'preview-price') return previewPrice(id)
    if (a === 'wizard-next') return nextWizard()
    if (a === 'wizard-back') {
      collectWizard()
      wizard.step--
      renderWizard()
      return
    }
    if (a === 'wizard-save') return saveWizard()
    if (a === 'cinema-detail-tab') {
      const [cid, index] = id.split('|')
      $$('.tabs button', $('#dialog')).forEach((btn) => btn.classList.toggle('active', btn === b))
      $('#cinema-detail-content').innerHTML = cinemaDetailContent(
        get('cinemas', cid),
        Number(index),
      )
      return
    }
    if (a === 'new-order') return newOrder()
    if (a === 'cancel-order') {
      if (!guard('operate', 'orders')) return
      const o = get('orders', id)
      if (o.status !== 'Chờ thanh toán' || o.tickets.some((t) => t.status === 'Đã sử dụng'))
        return toast('Đơn không thể hủy ở trạng thái này.', true)
      o.status = 'Đã hủy'
      o.tickets.forEach((t) => (t.status = 'Đã hủy'))
      o.history.push({
        at: new Date().toISOString(),
        action: 'Hủy đơn chưa thanh toán tại quầy',
      })
      const p = db.payments.find((p) => p.orderId === id)
      if (p && p.status === 'Chờ thanh toán') {
        p.status = 'Hết hạn'
        p.updatedAt = new Date().toISOString()
      }
      persist('Hủy đơn chưa thanh toán', id)
      closeDialog()
      drawChrome()
      render()
      toast('Đã hủy đơn và giải phóng ghế.')
      return
    }
    if (a === 'pay-order') {
      const p = db.payments.find((p) => p.orderId === id)
      detail('payments', p.id)
      return
    }
    if (a === 'payment-status') {
      const [pid, next] = id.split('|')
      return setPayment(pid, next)
    }
    if (a === 'reconcile') {
      if (!guard('operate', 'payments')) return
      const p = get('payments', id),
        o = get('orders', p.orderId),
        ticketSum =
          o.tickets.reduce((a, t) => a + t.price, 0) +
          o.items.reduce((a, i) => a + i.qty * i.unitPrice, 0) -
          o.discount
      if (
        p.status !== 'Thành công' ||
        p.amount !== o.total ||
        o.total !== ticketSum ||
        o.status !== 'Đã xác nhận'
      )
        return toast('Số tiền hoặc trạng thái đơn không khớp. Chưa thể xác nhận.', true)
      p.needsReview = false
      p.updatedAt = new Date().toISOString()
      persist('Đối chiếu giao dịch', id)
      closeDialog()
      render()
      toast('Giao dịch và đơn hàng đã khớp.')
      return
    }
    if (a === 'scan-demo') {
      state.check = {
        code: 'VE-DEMO',
      }
      render()
      return
    }
    if (a === 'confirm-checkin') {
      if (!guard('operate', 'checkin')) return
      const found = findTickets(id)[0]
      if (!found || ticketValidity(found.o, found.t) !== 'Hợp lệ')
        return toast('Vé không đủ điều kiện check-in.', true)
      found.t.status = 'Đã sử dụng'
      found.o.history.push({
        at: new Date().toISOString(),
        action: 'Check-in vé ' + id + ' bởi ' + employee().name,
      })
      persist('Xác nhận check-in', id)
      render()
      toast('Check-in thành công. Chúc khách xem phim vui vẻ!')
      return
    }
    if (a === 'export') return exportCSV()
    if (a === 'notifications') {
      showDialog(
        'Thông báo vận hành',
        warnings()
          .map(
            (w) =>
              `<a class="alert-line" href="${w.href}" data-action="close">${icon('alert')}<div><p>${esc(w.title)}</p><small>${esc(w.sub)}</small></div></a>`,
          )
          .join('') || empty('Không có thông báo'),
        button('Đóng', 'close'),
      )
      return
    }
    if (a === 'reset') {
      if (!guard('edit', 'settings')) return
      showDialog(
        'Khôi phục dữ liệu mẫu',
        `<div class="notice">Toàn bộ dữ liệu bạn đã chỉnh trong bản minh họa trên trình duyệt này sẽ được thay bằng dữ liệu mẫu mới. Phạm vi: toàn hệ thống.</div><p>Nhập <b>KHÔI PHỤC</b> để xác nhận.</p><input id="reset-confirm" aria-label="Nhập KHÔI PHỤC để xác nhận" style="padding:10px;width:100%;margin-top:15px">`,
        button('Giữ dữ liệu hiện tại', 'close') +
          button('Khôi phục dữ liệu', 'reset-confirm', '', 'danger'),
      )
      return
    }
    if (a === 'reset-confirm') {
      if (!guard('edit', 'settings')) return
      if ($('#reset-confirm').value !== 'KHÔI PHỤC')
        return toast('Nhập đúng KHÔI PHỤC để xác nhận.', true)
      db = D.seed()
      state.scope = 'all'
      state.employee = 'E1'
      state.selectedSeats.clear()
      persist('Khôi phục dữ liệu mẫu', 'Toàn hệ thống')
      closeDialog()
      drawChrome()
      render()
      toast('Đã khôi phục dữ liệu mẫu.')
      return
    }
  })
  document.addEventListener('change', (e) => {
    const el = e.target
    if (el.id === 'scope') {
      state.scope = el.value
      state.page = 1
      state.selectedSeats.clear()
      drawChrome()
      render()
      return
    }
    if (el.id === 'employee') {
      state.employee = el.value
      state.scope = 'all'
      state.q = ''
      state.filter = {}
      state.page = 1
      state.selectedSeats.clear()
      closeDialog()
      drawChrome()
      if (!can('view', current())) location.hash = 'dashboard'
      else render()
      toast('Đang mô phỏng vai trò: ' + role())
      return
    }
    if (el.dataset.filter) {
      state.filter[el.dataset.filter] = el.value
      state.page = 1
      render()
      return
    }
    if (el.id === 'range-start' || el.id === 'range-end') {
      const start = el.id === 'range-start' ? el.value : state.rangeStart,
        end = el.id === 'range-end' ? el.value : state.rangeEnd
      if (!start || !end || start > end) {
        toast('Ngày bắt đầu phải không sau ngày kết thúc.', true)
        el.value = el.id === 'range-start' ? state.rangeStart : state.rangeEnd
        return
      }
      state.rangeStart = start
      state.rangeEnd = end
      render()
      return
    }
    if (el.id === 'report-group') {
      state.filter.group = el.value
      render()
      return
    }
    if (el.id === 'show-date') {
      state.filter.date = el.value
      state.page = 1
      render()
      return
    }
    if (el.id === 'seat-room') {
      state.roomId = el.value
      state.selectedSeats.clear()
      render()
      return
    }
    if (el.id === 'permission-role') {
      state.filter.permissionRole = el.value
      render()
      return
    }
    if (el.closest('#entity-form') && editing?.type === 'shows') {
      if (el.name === 'movieId') syncShowVersions()
      updateShowHints()
      return
    }
    if (el.id === 'wizard-format' || el.id === 'wizard-time') {
      collectWizard()
      wizard[el.id === 'wizard-format' ? 'format' : 'time'] = el.value
      renderWizard()
      return
    }
    if (el.dataset.modekey) {
      const input = $('[data-pricekey="' + CSS.escape(el.dataset.modekey) + '"]')
      input.disabled = el.value === 'NA'
      if (el.value === 'NA') input.value = ''
      collectWizard()
      return
    }
    if (el.closest('#price-calculator')) {
      const p =
        wizard?.step === 4 ? wizard.data : get('pricing', $('#price-calculator').dataset.tableId)
      updatePriceQuote(p)
      return
    }
    if (el.closest('#order-form')) {
      if (el.name === 'showId') renderOrderSeats()
      updateOrderQuote()
      return
    }
  })
  let searchTimer
  document.addEventListener('input', (e) => {
    const el = e.target
    if (el.id === 'search') {
      state.q = el.value
      state.page = 1
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        const pos = el.selectionStart
        render()
        const n = $('#search')
        n?.focus()
        n?.setSelectionRange(pos, pos)
      }, 160)
      return
    }
    if (el.dataset.pricekey) {
      collectWizard()
      return
    }
    if (el.closest('#order-form')) updateOrderQuote()
    if (el.closest('#price-calculator')) {
      updatePriceQuote(
        wizard?.step === 4 ? wizard.data : get('pricing', $('#price-calculator').dataset.tableId),
      )
    }
    if (
      el.closest('#entity-form') &&
      editing?.type === 'shows' &&
      ['time', 'date', 'breakMinutes'].includes(el.name)
    )
      updateShowHints()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.body.classList.remove('mobile-open')
  })
  document.addEventListener('submit', (e) => {
    e.preventDefault()
    const f = e.target
    if (f.id === 'entity-form') return saveEntity(f)
    if (f.id === 'price-form') {
      if (wizard.step < 4) nextWizard()
      else saveWizard()
      return
    }
    if (f.id === 'checkin-form') {
      state.check = {
        code: String(new FormData(f).get('code')).trim(),
      }
      render()
      return
    }
    if (f.id === 'order-form') return createOrder(f)
    if (f.id === 'settings-form') {
      if (!guard('edit', 'settings')) return
      const fd = new FormData(f),
        v = Object.fromEntries(fd)
      if (!safeURL(v.logo)) return toast('Logo chỉ dùng đường dẫn assets/ hoặc HTTPS.', true)
      db.settings = {
        ...db.settings,
        ...v,
        holdMinutes: Number(v.holdMinutes),
        breakMinutes: Number(v.breakMinutes),
        membership: fd.has('membership'),
      }
      persist('Cập nhật cài đặt', 'Toàn hệ thống')
      drawChrome()
      render()
      toast('Đã lưu cài đặt chung.')
      return
    }
    if (f.id === 'permissions-form') {
      if (!guard('edit', 'staff')) return
      const r = state.filter.permissionRole || 'Quản lý rạp'
      if (r === 'Quản trị hệ thống') return
      const fd = new FormData(f),
        per = {}
      Object.keys(titles).forEach(
        (k) =>
          (per[k] = Object.fromEntries(
            ['view', 'create', 'edit', 'operate'].map((a) => [a, fd.has(k + '.' + a)]),
          )),
      )
      db.permissions[r] = per
      persist('Cập nhật phân quyền', r)
      drawChrome()
      render()
      toast('Đã cập nhật quyền của ' + r + '.')
      return
    }
  })
  $('#dialog').addEventListener('cancel', () => {
    wizard = null
  })
  window.addEventListener('hashchange', () => {
    closeDialog()
    route()
  })
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        const next = JSON.parse(e.newValue)
        if (next.version === 1) {
          db = next
          closeDialog()
          drawChrome()
          render()
          toast('Dữ liệu đã cập nhật từ tab khác.')
        }
      } catch {
        toast('Dữ liệu từ tab khác không hợp lệ.', true)
      }
    }
  })
  setInterval(expireOrders, 30000)
  route()
  expireOrders()
  // Small public read-only diagnostic interface for local verification.
  window.LumiereDemo = {
    snapshot: () => structuredClone(db),
    validate: () => {
      const errors = []
      for (const s of db.shows) {
        const r = get('rooms', s.roomId),
          m = get('movies', s.movieId),
          v = m?.versions.find((v) => v.id === s.versionId)
        if (!r || !m || !v || !r.formats.includes(v.format))
          errors.push('Suất không tương thích: ' + s.id)
      }
      for (const o of db.orders) {
        const s = get('shows', o.showId),
          r = s && get('rooms', s.roomId)
        if (!r || o.tickets.some((t) => !r.seats.some((seat) => seat.id === t.seatId)))
          errors.push('Ghế không tồn tại: ' + o.id)
        if (
          o.total !==
          o.tickets.reduce((n, t) => n + t.price, 0) +
            o.items.reduce((n, i) => n + i.qty * i.unitPrice, 0) -
            o.discount
        )
          errors.push('Tổng đơn sai: ' + o.id)
        const p = db.payments.find((p) => p.orderId === o.id)
        if (!p || p.amount !== o.total) errors.push('Giao dịch không khớp: ' + o.id)
      }
      return errors
    },
  }
})()
