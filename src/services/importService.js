import * as XLSX from 'xlsx'
import prisma from './prisma.js'
import { parseDate, parseNumber } from '../utils/importHelpers.js'

async function createManyIgnoreDuplicates(model, items) {
  for (const data of items) {
    try {
      await model.create({ data })
    } catch (e) {
      // игнорируем — запись уже существует
    }
  }
}

const REQUIRED_COLUMNS = ['ОС', 'Инвентарный номер']

export async function parseAndBuildMaps(buffer) {
  if (!buffer || buffer.length === 0) {
    throw Object.assign(new Error('Файл пустой'), { status: 400 })
  }

  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  } catch {
    throw Object.assign(new Error('Не удалось прочитать файл — убедитесь, что это файл Excel (.xlsx)'), { status: 400 })
  }

  if (!workbook.SheetNames.length) {
    throw Object.assign(new Error('Файл Excel не содержит листов'), { status: 400 })
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

  if (rows.length === 0) {
    throw Object.assign(new Error('Первый лист файла не содержит данных'), { status: 400 })
  }

  const firstRow = rows[0]
  const missingColumns = REQUIRED_COLUMNS.filter(col => !(col in firstRow))
  if (missingColumns.length > 0) {
    throw Object.assign(
      new Error(`В файле отсутствуют обязательные столбцы: ${missingColumns.join(', ')}`),
      { status: 400 }
    )
  }

  // Собираем уникальные значения справочников из файла
  const orgNames = new Set()
  const molNames = new Set()
  const locNames = new Set()
  const empNames = new Set()

  for (const row of rows) {
    if (row['Организация']) orgNames.add(row['Организация'])
    molNames.add(row['МОЛ'] || 'Не указан')
    locNames.add(row['Местонахождение'] || 'Не указано')
    if (row['Сотрудник']) empNames.add(row['Сотрудник'])
  }

  // Загружаем уже существующие записи справочников
  const [existingOrgs, existingMols, existingLocs, existingEmps] = await Promise.all([
    orgNames.size > 0
      ? prisma.organization.findMany({ where: { name: { in: [...orgNames] } } })
      : [],
    prisma.responsiblePerson.findMany({ where: { fullName: { in: [...molNames] } } }),
    prisma.location.findMany({ where: { name: { in: [...locNames] } } }),
    empNames.size > 0
      ? prisma.employee.findMany({ where: { fullName: { in: [...empNames] } } })
      : [],
  ])

  const orgMap = Object.fromEntries(existingOrgs.map(o => [o.name, o]))
  const molMap = Object.fromEntries(existingMols.map(o => [o.fullName, o]))
  const locMap = Object.fromEntries(existingLocs.map(o => [o.name, o]))
  const empMap = Object.fromEntries(existingEmps.map(o => [o.fullName, o]))

  // Создаём недостающие записи справочников
  const newOrgs = [...orgNames].filter(n => !orgMap[n]).map(name => ({ name }))
  const newMols = [...molNames].filter(n => !molMap[n]).map(fullName => ({ fullName }))
  const newLocs = [...locNames].filter(n => !locMap[n]).map(name => ({ name }))
  const newEmps = [...empNames].filter(n => !empMap[n]).map(fullName => ({ fullName }))

  if (newOrgs.length) {
    await createManyIgnoreDuplicates(prisma.organization, newOrgs)
    const created = await prisma.organization.findMany({
      where: { name: { in: newOrgs.map(o => o.name) } }
    })
    created.forEach(o => orgMap[o.name] = o)
  }
  if (newMols.length) {
    await createManyIgnoreDuplicates(prisma.responsiblePerson, newMols)
    const created = await prisma.responsiblePerson.findMany({
      where: { fullName: { in: newMols.map(o => o.fullName) } }
    })
    created.forEach(o => molMap[o.fullName] = o)
  }
  if (newLocs.length) {
    await createManyIgnoreDuplicates(prisma.location, newLocs)
    const created = await prisma.location.findMany({
      where: { name: { in: newLocs.map(o => o.name) } }
    })
    created.forEach(o => locMap[o.name] = o)
  }
  if (newEmps.length) {
    await createManyIgnoreDuplicates(prisma.employee, newEmps)
    const created = await prisma.employee.findMany({
      where: { fullName: { in: newEmps.map(o => o.fullName) } }
    })
    created.forEach(o => empMap[o.fullName] = o)
  }

  // Строим итоговый список ОС из файла
  const parsed = []
  let skipped = 0

  for (const row of rows) {
    const invNumber = row['Инвентарный номер'] ? String(row['Инвентарный номер']).trim() : null
    const assetName = row['ОС']
    const orgName   = row['Организация'] || null

    // Пропускаем строки без инвентарного номера или названия
    if (!invNumber || !assetName) { skipped++; continue }

    const locKey = row['Местонахождение'] || 'Не указано'
    const molKey = row['МОЛ'] || 'Не указан'
    const empKey = row['Сотрудник'] || null

    parsed.push({
      inventoryNumber:      invNumber,
      name:                 assetName,
      assetType:            row['Тип'] || '',
      assetFaType:          row['Тип ФА'] || null,
      barcode:              row['Штрих-код']       ? String(row['Штрих-код']).trim()       : null,
      factoryNumber:        row['Заводской номер'] ? String(row['Заводской номер']).trim() : null,
      accountingAccount:    row['Счет учета БУ']   ? String(row['Счет учета БУ'])          : null,
      bookValue:            parseNumber(row['Стоимость БУ']),
      residualValue:        parseNumber(row['Остаточная стоимость']),
      depreciationPercent:  parseNumber(row['Процент износа']),
      depreciationMonths:   row['Срок износа']          ? Number(row['Срок износа'])          : null,
      depreciationEndYear:  row['Год окончания износа'] ? Number(row['Год окончания износа']) : null,
      acceptanceDate:       parseDate(row['Дата принятия']),
      assignmentDate:       parseDate(row['Дата закрепления']) || null,
      locationId:           locMap[locKey]?.id     || null,
      responsiblePersonId:  molMap[molKey]?.id     || null,
      // ВОЗВРАЩЕНО: organizationId из файла
      organizationId:       orgName ? orgMap[orgName]?.id || null : null,
      employeeId:           empKey  ? empMap[empKey]?.id  || null : null,
      // Временные поля для human-readable — не пишутся в БД
      _locationName:        locKey,
      _molName:             molKey,
      _employeeName:        empKey || '—',
    })
  }

  return { parsed, skipped, total: rows.length }
}