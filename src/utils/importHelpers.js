import * as XLSX from 'xlsx'

// Парсит дату из Excel (число, Date, строка dd.mm.yyyy)
export function parseDate(val) {
  if (!val) return null
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) return new Date(date.y, date.m - 1, date.d)
    return null
  }
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  const str = String(val).trim()
  if (!str) return null
  const ddmmyyyy = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return isNaN(date.getTime()) ? null : date
  }
  const date = new Date(str)
  return isNaN(date.getTime()) ? null : date
}

// Парсит число — убирает пробелы и заменяет запятую на точку
export function parseNumber(val) {
  if (!val && val !== 0) return null
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// Нормализует строку для сравнения — убирает пробелы и приводит Unicode к единой форме
// Казахские символы могут храниться в разных Unicode-формах — NFC устраняет это
export function normalize(val) {
  if (val === null || val === undefined) return ''
  return String(val).trim().replace(/\s+/g, ' ').normalize('NFC')
}

// Поля для сравнения "изменилась ли запись"
const COMPARE_FIELDS = [
  'name', 'assetType', 'locationId',
  'responsiblePersonId', 'employeeId',
  'barcode', 'accountingAccount'
]

// Возвращает список изменённых полей между существующей и новой записью
export function getChanges(existing, incoming) {
  const changes = []
  for (const field of COMPARE_FIELDS) {
    const oldVal = existing[field] ?? null
    const newVal = incoming[field] ?? null
    const isId = field.endsWith('Id')
    const oldStr = isId ? String(oldVal ?? '') : normalize(oldVal)
    const newStr = isId ? String(newVal ?? '') : normalize(newVal)
    if (oldStr !== newStr) {
      changes.push({ field, oldVal, newVal })
    }
  }
  return changes
}

// Переводит технические изменения в человекочитаемый вид
// ИСПРАВЛЕНО: пропускает "ложные" изменения где human-readable значения одинаковые
// Это случается когда ID изменился (null → 128) но имя то же самое,
// или когда казахские символы в БД и файле хранятся в разных Unicode-формах
export function humanizeChanges(changes, existing, item) {
  const result = []

  for (const c of changes) {
    let entry = null

    if (c.field === 'locationId')
      entry = {
        field:  'Местонахождение',
        oldVal: existing.location?.name || '—',
        newVal: item._locationName,
      }
    else if (c.field === 'responsiblePersonId')
      entry = {
        field:  'МОЛ',
        oldVal: existing.responsiblePerson?.fullName || '—',
        newVal: item._molName,
      }
    else if (c.field === 'employeeId')
      entry = {
        field:  'Сотрудник',
        oldVal: existing.employee?.fullName || '—',
        newVal: item._employeeName,
      }
    else if (c.field === 'name')
      entry = { field: 'Наименование', oldVal: c.oldVal, newVal: c.newVal }
    else if (c.field === 'assetType')
      entry = { field: 'Тип',          oldVal: c.oldVal, newVal: c.newVal }
    else if (c.field === 'barcode')
      entry = { field: 'Штрих-код',    oldVal: c.oldVal, newVal: c.newVal }
    else if (c.field === 'accountingAccount')
      entry = { field: 'Счет БУ',      oldVal: c.oldVal, newVal: c.newVal }
    else
      entry = {
        field:  c.field,
        oldVal: String(c.oldVal ?? '—'),
        newVal: String(c.newVal ?? '—'),
      }

    // Пропускаем если human-readable значения одинаковые после нормализации
    if (entry && normalize(String(entry.oldVal)) !== normalize(String(entry.newVal))) {
      result.push(entry)
    }
  }

  return result
}