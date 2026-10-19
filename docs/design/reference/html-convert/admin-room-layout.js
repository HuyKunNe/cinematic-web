const initialRowCount = 6
const initialColumnCount = 6

const matrix = {
  columns: initialColumnCount,
  rows: Array.from({ length: initialRowCount }, () =>
    Array.from({ length: initialColumnCount }, () => null),
  ),
}

let selected = { row: 0, column: 0 }

const matrixBody = document.querySelector('#seatMatrixBody')
const matrixMessage = document.querySelector('#matrixMessage')
const seatTypeSelect = document.querySelector('#seatType')

function rowLabel(index) {
  let number = index + 1
  let label = ''

  while (number > 0) {
    number -= 1
    label = String.fromCharCode(65 + (number % 26)) + label
    number = Math.floor(number / 26)
  }

  return label
}

function selectedCell() {
  return matrix.rows[selected.row]?.[selected.column] ?? null
}

function occupiedInRow(row) {
  return row.filter(Boolean).length
}

function renumberRow(row) {
  let nextNumber = 1

  row.forEach((cell) => {
    if (cell) {
      cell.number = nextNumber
      nextNumber += 1
    }
  })
}

function renumberAllRows() {
  matrix.rows.forEach(renumberRow)
}

function announce(message, isError = false) {
  matrixMessage.textContent = message
  matrixMessage.classList.toggle('is-error', isError)
}

function updateSummary() {
  const seats = matrix.rows.flat().filter(Boolean)
  const standardCount = seats.filter((seat) => seat.seatType === 'STANDARD').length
  const vipCount = seats.filter((seat) => seat.seatType === 'VIP').length

  document.querySelector('#rowCount').textContent = matrix.rows.length
  document.querySelector('#columnCount').textContent = matrix.columns
  document.querySelector('#seatCount').textContent = seats.length
  document.querySelector('#summaryRows').textContent = matrix.rows.length
  document.querySelector('#summaryColumns').textContent = matrix.columns
  document.querySelector('#summarySeats').textContent = seats.length
  document.querySelector('#summaryStandard').textContent = standardCount
  document.querySelector('#summaryVip').textContent = vipCount
}

function updateInspector() {
  selected.row = Math.min(selected.row, matrix.rows.length - 1)
  selected.column = Math.min(selected.column, matrix.columns - 1)

  const cell = selectedCell()
  const currentRowLabel = rowLabel(selected.row)
  const cellTitle = cell
    ? `${currentRowLabel}${String(cell.number).padStart(2, '0')}`
    : `${currentRowLabel} · ô ${selected.column + 1}`

  document.querySelector('#selected-cell-title').textContent = cellTitle
  document.querySelector('#selectedSeatBadge').textContent = cell
    ? cell.seatType === 'VIP'
      ? 'VIP'
      : 'Standard'
    : 'Ô trống'

  seatTypeSelect.disabled = !cell
  seatTypeSelect.value = cell?.seatType ?? 'STANDARD'

  document.querySelector('#emptyCellHint').hidden = Boolean(cell)
  document.querySelector('[data-action="clear-cell"]').disabled = !cell

  document.querySelector('[data-action="delete-row"]').disabled = matrix.rows.length <= 1
  document.querySelector('[data-action="delete-column"]').disabled = matrix.columns <= 1
}

function renderMatrix(focusSelectedCell = false) {
  const fragment = document.createDocumentFragment()

  matrix.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr')
    const rowHeader = document.createElement('th')
    const rowButton = document.createElement('button')

    rowHeader.scope = 'row'
    rowButton.type = 'button'
    rowButton.className = 'layout-row-label'
    rowButton.textContent = rowLabel(rowIndex)
    rowButton.dataset.selectRow = String(rowIndex)
    rowButton.setAttribute('aria-label', `Chọn hàng ${rowLabel(rowIndex)}`)

    if (selected.row === rowIndex) {
      rowButton.classList.add('is-selected')
    }

    rowHeader.append(rowButton)
    tr.append(rowHeader)

    row.forEach((cell, columnIndex) => {
      const td = document.createElement('td')
      const input = document.createElement('input')
      const rowName = rowLabel(rowIndex)

      td.className = 'layout-matrix__cell'

      if (cell?.seatType === 'VIP') {
        td.classList.add('is-vip')
      } else if (cell) {
        td.classList.add('is-standard')
      }

      if (selected.row === rowIndex && selected.column === columnIndex) {
        td.classList.add('is-selected')
      }

      input.type = 'number'
      input.min = '1'
      input.step = '1'
      input.inputMode = 'numeric'
      input.className = 'layout-cell-input'
      input.value = cell?.number ?? ''
      input.readOnly = Boolean(cell)
      input.dataset.seatInput = 'true'
      input.dataset.row = String(rowIndex)
      input.dataset.column = String(columnIndex)
      input.setAttribute('aria-label', `Số ghế hàng ${rowName}, ô ${columnIndex + 1}`)
      input.setAttribute('aria-describedby', 'matrixHelp matrixMessage')

      td.append(input)
      tr.append(td)
    })

    fragment.append(tr)
  })

  matrixBody.replaceChildren(fragment)
  updateInspector()
  updateSummary()

  if (focusSelectedCell) {
    const input = matrixBody.querySelector(
      `[data-seat-input][data-row="${selected.row}"][data-column="${selected.column}"]`,
    )
    input?.focus()
  }
}

function commitSeatInput(input) {
  const rowIndex = Number(input.dataset.row)
  const columnIndex = Number(input.dataset.column)
  const row = matrix.rows[rowIndex]
  const rawValue = input.value.trim()

  selected = { row: rowIndex, column: columnIndex }

  if (!rawValue) {
    announce('Ô trống chưa tạo ghế.')
    updateInspector()
    return
  }

  const number = Number(rawValue)

  if (!Number.isSafeInteger(number) || number < 1) {
    announce('Nhập số nguyên lớn hơn 0.', true)
    input.setAttribute('aria-invalid', 'true')
    input.value = ''
    return
  }

  const isDuplicate = row.some((cell) => cell?.number === number)

  if (isDuplicate) {
    announce('Số ghế đã được dùng trong hàng này.', true)
    input.setAttribute('aria-invalid', 'true')
    input.value = ''
    return
  }

  const expectedNumber = occupiedInRow(row) + 1

  if (number !== expectedNumber) {
    announce(`Hàng ${rowLabel(rowIndex)} đang cần số ${expectedNumber}.`, true)
    input.setAttribute('aria-invalid', 'true')
    input.value = ''
    return
  }

  row[columnIndex] = {
    number,
    seatType: 'STANDARD',
  }

  renumberRow(row)
  announce(
    `Đã thêm ghế Standard ở hàng ${rowLabel(rowIndex)}. Số ghế trong hàng đã được sắp xếp lại từ 1.`,
  )
  renderMatrix(true)
}

function insertRow(index) {
  const newRow = Array.from({ length: matrix.columns }, () => null)
  matrix.rows.splice(index, 0, newRow)
  selected.row = index
  renumberAllRows()
  renderMatrix()
}

function insertColumn(index) {
  matrix.rows.forEach((row) => row.splice(index, 0, null))
  matrix.columns += 1
  selected.column = index
  renumberAllRows()
  renderMatrix()
}

matrixBody.addEventListener('focusin', (event) => {
  const input = event.target.closest('[data-seat-input]')
  if (!input) return

  selected = {
    row: Number(input.dataset.row),
    column: Number(input.dataset.column),
  }

  matrixBody.querySelectorAll('.layout-matrix__cell.is-selected').forEach((cell) => {
    cell.classList.remove('is-selected')
  })

  input.closest('td')?.classList.add('is-selected')
  updateInspector()
})

matrixBody.addEventListener('change', (event) => {
  const input = event.target.closest('[data-seat-input]')
  if (!input || input.readOnly) return

  input.removeAttribute('aria-invalid')
  commitSeatInput(input)
})

matrixBody.addEventListener('click', (event) => {
  const rowButton = event.target.closest('[data-select-row]')
  if (!rowButton) return

  selected.row = Number(rowButton.dataset.selectRow)
  selected.column = Math.min(selected.column, matrix.columns - 1)
  renderMatrix()
})

seatTypeSelect.addEventListener('change', () => {
  const cell = selectedCell()
  if (!cell) return

  cell.seatType = seatTypeSelect.value
  announce(`Đã đổi loại ghế ${rowLabel(selected.row)}${cell.number}.`)
  renderMatrix()
})

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]')
  if (!button) return

  const row = selected.row
  const column = selected.column

  switch (button.dataset.action) {
    case 'add-row':
      insertRow(matrix.rows.length)
      announce('Đã thêm hàng mới.')
      break

    case 'add-column':
      insertColumn(matrix.columns)
      announce('Đã thêm cột mới.')
      break

    case 'insert-row-before':
      insertRow(row)
      announce(`Đã chèn hàng phía trên hàng ${rowLabel(row)}.`)
      break

    case 'insert-row-after':
      insertRow(row + 1)
      announce(`Đã chèn hàng phía dưới hàng ${rowLabel(row)}.`)
      break

    case 'delete-row':
      if (matrix.rows.length <= 1) {
        announce('Ma trận phải có ít nhất một hàng.', true)
        break
      }

      matrix.rows.splice(row, 1)
      selected.row = Math.min(row, matrix.rows.length - 1)
      renumberAllRows()
      renderMatrix()
      announce('Đã xóa hàng. Nhãn hàng được cập nhật lại theo thứ tự.')
      break

    case 'insert-column-before':
      insertColumn(column)
      announce('Đã chèn cột bên trái.')
      break

    case 'insert-column-after':
      insertColumn(column + 1)
      announce('Đã chèn cột bên phải.')
      break

    case 'delete-column':
      if (matrix.columns <= 1) {
        announce('Ma trận phải có ít nhất một cột.', true)
        break
      }

      matrix.rows.forEach((seatRow) => seatRow.splice(column, 1))
      matrix.columns -= 1
      selected.column = Math.min(column, matrix.columns - 1)
      renumberAllRows()
      renderMatrix()
      announce('Đã xóa cột và đánh số lại ghế trong từng hàng.')
      break

    case 'clear-cell': {
      const seatRow = matrix.rows[row]
      if (!seatRow[column]) break

      seatRow[column] = null
      renumberRow(seatRow)
      renderMatrix()
      announce('Đã xóa ghế trong ô. Các ghế còn lại đã được đánh số lại.')
      break
    }
  }
})

renderMatrix()
