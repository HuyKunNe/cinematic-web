;(() => {
  'use strict'

  const root = document.querySelector('[data-reference="admin-room-layout"]')
  if (!root) return

  const types = {
    STANDARD: 'Standard',
    VIP: 'VIP',
    COUPLE: 'Couple',
    ACCESSIBLE: 'Accessible',
  }

  const body = root.querySelector('#seatMatrixBody')
  const status = root.querySelector('#matrixStatus')
  const error = root.querySelector('#matrixError')
  const typeSelect = root.querySelector('#seatType')

  function emptyRow(columns) {
    return Array.from({ length: columns }, () => null)
  }

  function initialMatrix() {
    return {
      columns: 6,
      rows: Array.from({ length: 6 }, () => emptyRow(6)),
    }
  }

  let matrix = initialMatrix()
  let selected = { row: 0, column: 0 }

  function rowLabel(index) {
    let value = index + 1
    let label = ''

    while (value > 0) {
      value -= 1
      label = String.fromCharCode(65 + (value % 26)) + label
      value = Math.floor(value / 26)
    }

    return label
  }

  function renumberRow(row) {
    let number = 0

    for (const seat of row) {
      if (seat) seat.number = ++number
    }
  }

  function renumberAll() {
    matrix.rows.forEach(renumberRow)
  }

  function selectedSeat() {
    return matrix.rows[selected.row][selected.column]
  }

  function announce(message, isError = false) {
    error.hidden = !isError
    error.textContent = isError ? message : ''
    status.textContent = isError ? '' : message
  }

  function setSelection(row, column) {
    selected = {
      row: Math.max(0, Math.min(row, matrix.rows.length - 1)),
      column: Math.max(0, Math.min(column, matrix.columns - 1)),
    }

    updateInspector()
    updateSelection()
  }

  function updateSelection() {
    for (const input of body.querySelectorAll('[data-seat-input]')) {
      const active =
        Number(input.dataset.row) === selected.row &&
        Number(input.dataset.column) === selected.column

      input.closest('td').classList.toggle('is-selected', active)
    }

    for (const button of body.querySelectorAll('[data-select-row]')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.selectRow) === selected.row))
    }
  }

  function updateInspector() {
    const seat = selectedSeat()
    const label = rowLabel(selected.row)

    root.querySelector('#selectedCellTitle').textContent = seat
      ? `${label}${seat.number}`
      : `${label} · ô ${selected.column + 1}`

    root.querySelector('#selectedSeatBadge').textContent = seat ? types[seat.seatType] : 'Ô trống'

    root.querySelector('#selectedCellHint').textContent = seat
      ? 'Số ghế tự cập nhật theo thứ tự trong hàng. Có thể đổi loại hoặc xóa ghế.'
      : 'Nhập số nguyên dương chưa dùng trong hàng để thêm ghế Standard.'

    typeSelect.disabled = !seat
    typeSelect.value = seat?.seatType ?? 'STANDARD'

    root.querySelector('[data-action="clear-cell"]').disabled = !seat
    root.querySelector('[data-action="delete-row"]').disabled = matrix.rows.length <= 1
    root.querySelector('[data-action="delete-column"]').disabled = matrix.columns <= 1
  }

  function updateSummary() {
    const seats = matrix.rows.flat().filter((seat) => seat !== null)

    const counts = {
      rows: matrix.rows.length,
      columns: matrix.columns,
      seats: seats.length,
      empty: matrix.rows.length * matrix.columns - seats.length,
      STANDARD: 0,
      VIP: 0,
      COUPLE: 0,
      ACCESSIBLE: 0,
    }

    for (const seat of seats) counts[seat.seatType] += 1

    for (const node of root.querySelectorAll('[data-count]')) {
      node.textContent = String(counts[node.dataset.count])
    }

    root.querySelector('#matrixSize').textContent = `${matrix.rows.length} × ${matrix.columns}`
  }

  function syncCells() {
    for (const input of body.querySelectorAll('[data-seat-input]')) {
      const row = Number(input.dataset.row)
      const column = Number(input.dataset.column)
      const seat = matrix.rows[row][column]
      const cell = input.closest('td')

      input.value = seat ? String(seat.number) : ''
      input.readOnly = Boolean(seat)
      input.removeAttribute('aria-invalid')

      if (seat) {
        cell.dataset.seatType = seat.seatType
      } else {
        delete cell.dataset.seatType
      }

      input.setAttribute(
        'aria-label',
        seat
          ? `Ghế ${rowLabel(row)}${seat.number}, ${types[seat.seatType]}`
          : `Ô trống hàng ${rowLabel(row)}, vị trí ${column + 1}`,
      )
    }

    updateSelection()
    updateInspector()
    updateSummary()
  }

  function focusSelectedCell() {
    const input = body.querySelector(
      `[data-seat-input][data-row="${selected.row}"]` + `[data-column="${selected.column}"]`,
    )

    input?.focus()
  }

  function renderMatrix(focusCell = false) {
    const fragment = document.createDocumentFragment()

    matrix.rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr')
      const th = document.createElement('th')
      const rowButton = document.createElement('button')

      th.scope = 'row'
      th.id = `matrix-row-${rowIndex}`

      rowButton.type = 'button'
      rowButton.className = 'layout-row-label'
      rowButton.dataset.selectRow = String(rowIndex)
      rowButton.textContent = rowLabel(rowIndex)
      rowButton.setAttribute('aria-label', `Chọn hàng ${rowLabel(rowIndex)}`)

      th.append(rowButton)
      tr.append(th)

      row.forEach((_, columnIndex) => {
        const td = document.createElement('td')
        const input = document.createElement('input')

        td.setAttribute('headers', th.id)

        input.type = 'text'
        input.inputMode = 'numeric'
        input.autocomplete = 'off'
        input.spellcheck = false
        input.className = 'layout-cell-input'
        input.dataset.seatInput = ''
        input.dataset.row = String(rowIndex)
        input.dataset.column = String(columnIndex)
        input.setAttribute('aria-describedby', 'matrixHelp matrixStatus matrixError')

        td.append(input)
        tr.append(td)
      })

      fragment.append(tr)
    })

    body.replaceChildren(fragment)
    syncCells()

    if (focusCell) focusSelectedCell()
  }

  function rejectInput(input, message) {
    input.value = ''
    input.setAttribute('aria-invalid', 'true')
    announce(message, true)
    return false
  }

  function commitSeatInput(input) {
    if (input.readOnly) return true

    const rowIndex = Number(input.dataset.row)
    const columnIndex = Number(input.dataset.column)
    const raw = input.value.trim()
    const row = matrix.rows[rowIndex]

    setSelection(rowIndex, columnIndex)

    if (!raw) return true

    if (!/^[0-9]+$/.test(raw)) {
      return rejectInput(input, 'Số ghế phải là số nguyên dương, ví dụ 1, 2 hoặc 3.')
    }

    const number = Number(raw)

    if (!Number.isSafeInteger(number) || number <= 0) {
      return rejectInput(input, 'Nhập số nguyên lớn hơn 0 trong giới hạn an toàn.')
    }

    if (row.some((seat) => seat?.number === number)) {
      return rejectInput(
        input,
        `Hàng ${rowLabel(rowIndex)} đã có số ${number}. Hãy nhập số chưa dùng.`,
      )
    }

    row[columnIndex] = { number, seatType: 'STANDARD' }
    renumberRow(row)
    syncCells()

    announce(
      `Đã thêm ghế ${rowLabel(rowIndex)}${row[columnIndex].number}. ` +
        'Các ghế trong hàng đã được đánh số liên tiếp theo vị trí.',
    )

    return true
  }

  function insertRow(index) {
    matrix.rows.splice(index, 0, emptyRow(matrix.columns))
    selected.row = index
    renumberAll()
    renderMatrix(true)
    announce(`Đã chèn hàng ${rowLabel(index)}. Nhãn các hàng đã được cập nhật.`)
  }

  function insertColumn(index) {
    for (const row of matrix.rows) row.splice(index, 0, null)

    matrix.columns += 1
    selected.column = index
    renumberAll()
    renderMatrix(true)
    announce('Đã chèn một cột trống trên tất cả hàng.')
  }

  body.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Element)) return

    const input = event.target.closest('[data-seat-input]')
    if (!input) return

    setSelection(Number(input.dataset.row), Number(input.dataset.column))
  })

  body.addEventListener('change', (event) => {
    if (!(event.target instanceof Element)) return

    const input = event.target.closest('[data-seat-input]')
    if (input) commitSeatInput(input)
  })

  body.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing) return
    if (!(event.target instanceof Element)) return

    const input = event.target.closest('[data-seat-input]')
    if (!input) return

    event.preventDefault()
    commitSeatInput(input)
  })

  body.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return

    const button = event.target.closest('[data-select-row]')
    if (!button) return

    setSelection(Number(button.dataset.selectRow), selected.column)
    focusSelectedCell()
  })

  typeSelect.addEventListener('change', () => {
    const seat = selectedSeat()
    const type = typeSelect.value

    if (!seat || !Object.hasOwn(types, type)) return

    seat.seatType = type
    syncCells()
    announce(`Đã đổi ghế ${rowLabel(selected.row)}${seat.number} sang ${types[type]}.`)
  })

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return

    const button = event.target.closest('[data-action]')
    if (!button || button.disabled) return

    const row = selected.row
    const column = selected.column

    switch (button.dataset.action) {
      case 'new-layout': {
        const hasSeats = matrix.rows.some((items) => items.some(Boolean))

        if (hasSeats && !window.confirm('Tạo layout 6 × 6 trống và bỏ các ghế đang chỉnh?')) {
          return
        }

        matrix = initialMatrix()
        selected = { row: 0, column: 0 }
        renderMatrix()
        announce('Đã tạo layout mới: 6 hàng, 6 cột và 0 ghế.')
        break
      }

      case 'add-row':
        insertRow(matrix.rows.length)
        break

      case 'add-column':
        insertColumn(matrix.columns)
        break

      case 'insert-row-before':
        insertRow(row)
        break

      case 'insert-row-after':
        insertRow(row + 1)
        break

      case 'insert-column-before':
        insertColumn(column)
        break

      case 'insert-column-after':
        insertColumn(column + 1)
        break

      case 'delete-row':
        if (matrix.rows.length <= 1) return

        matrix.rows.splice(row, 1)
        selected.row = Math.min(row, matrix.rows.length - 1)
        renumberAll()
        renderMatrix(true)
        announce('Đã xóa hàng cùng các ghế. Nhãn hàng đã được cập nhật.')
        break

      case 'delete-column':
        if (matrix.columns <= 1) return

        for (const items of matrix.rows) items.splice(column, 1)

        matrix.columns -= 1
        selected.column = Math.min(column, matrix.columns - 1)
        renumberAll()
        renderMatrix(true)
        announce('Đã xóa cột trên tất cả hàng và đánh số lại ghế.')
        break

      case 'clear-cell':
        if (!selectedSeat()) return

        matrix.rows[row][column] = null
        renumberRow(matrix.rows[row])
        syncCells()
        focusSelectedCell()
        announce('Đã xóa ghế. Ô vẫn được giữ trống trong ma trận.')
        break
    }
  })

  renderMatrix()
})()
