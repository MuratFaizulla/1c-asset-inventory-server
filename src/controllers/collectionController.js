import prisma  from '../services/prisma.js'
import crypto  from 'crypto'

// Код меняется каждые 8 часов (3 периода в сутки: 00-08, 08-16, 16-24)
function getDeleteCode() {
  const SECRET = process.env.DELETE_CODE_SECRET || 'nis-collection-secret-key'
  const period = Math.floor(Date.now() / (8 * 60 * 60 * 1000))
  return crypto.createHash('sha256').update(`${SECRET}-${period}`).digest('hex').slice(0, 6).toUpperCase()
}

// GET /api/collection/code — текущий код (для администратора)
export const getDeleteCode_ = (_req, res) => {
  const code = getDeleteCode()
  const now  = new Date()
  const periodMs    = 8 * 60 * 60 * 1000
  const nextPeriod  = (Math.floor(Date.now() / periodMs) + 1) * periodMs
  const expiresIn   = Math.round((nextPeriod - Date.now()) / 60000) // минут до смены
  res.json({ code, expiresInMinutes: expiresIn, hint: 'Код меняется каждые 8 часов' })
}

const ASSET_INCLUDE = {
  location:          { select: { id: true, name: true } },
  responsiblePerson: { select: { id: true, fullName: true } },
  employee:          { select: { id: true, fullName: true } },
  organization:      { select: { id: true, name: true } },
}

function calcStats(items) {
  return {
    total:    items.length,
    returned: items.filter(i => i.status === 'RETURNED').length,
    damaged:  items.filter(i => i.status === 'DAMAGED').length,
    lost:     items.filter(i => i.status === 'LOST').length,
    pending:  items.filter(i => i.status === 'PENDING').length,
  }
}

// GET /api/collection
export const getSessions = async (_req, res) => {
  try {
    const sessions = await prisma.collectionSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    })
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/collection
export const createSession = async (req, res) => {
  try {
    const { name, assetType, assetName, deadline, createdBy, note } = req.body
    if (!name) return res.status(400).json({ error: 'Поле name обязательно' })

    const where = {}
    if (assetName)  where.name      = assetName   // фильтр по наименованию ОС
    else if (assetType) where.assetType = assetType

    const assets = await prisma.asset.findMany({ where, select: { id: true } })

    const session = await prisma.collectionSession.create({
      data: {
        name,
        assetType: assetName || assetType || null, // сохраняем что выбрали
        deadline:  deadline  ? new Date(deadline) : null,
        createdBy: createdBy || null,
        note:      note      || null,
        items: { create: assets.map(a => ({ assetId: a.id, status: 'PENDING' })) },
      },
      include: { _count: { select: { items: true } } },
    })

    res.status(201).json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/collection/:id
export const getSessionById = async (req, res) => {
  try {
    const session = await prisma.collectionSession.findUnique({
      where:   { id: Number(req.params.id) },
      include: {
        items: {
          include: {
            asset: { include: ASSET_INCLUDE },
            logs:  { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { asset: { inventoryNumber: 'asc' } },
        },
      },
    })
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })

    res.json({ ...session, stats: calcStats(session.items) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/collection/:id  (требует код в body)
export const deleteSession = async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Поле code обязательно' })
    if (code.toUpperCase() !== getDeleteCode()) {
      return res.status(403).json({ error: 'Неверный код. Проверьте код в /api/collection/code' })
    }
    const sessionId = Number(req.params.id)
    await prisma.$transaction([
      prisma.collectionItem.deleteMany({ where: { sessionId } }),
      prisma.collectionSession.delete({ where: { id: sessionId } }),
    ])
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/collection/:id/scan — принять технику по штрих-коду / инв. номеру
export const scanItem = async (req, res) => {
  try {
    const sessionId   = Number(req.params.id)
    const { barcode, returnedBy, note, status = 'RETURNED' } = req.body

    if (!barcode) return res.status(400).json({ error: 'Поле barcode обязательно' })
    if (!['RETURNED', 'DAMAGED', 'LOST'].includes(status)) {
      return res.status(400).json({ error: 'status должен быть RETURNED, DAMAGED или LOST' })
    }

    const [session, asset] = await Promise.all([
      prisma.collectionSession.findUnique({ where: { id: sessionId } }),
      prisma.asset.findFirst({
        where:   { OR: [{ barcode }, { inventoryNumber: barcode }] },
        include: { ...ASSET_INCLUDE },
      }),
    ])

    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })
    if (session.status === 'CLOSED') return res.status(400).json({ error: 'Сессия закрыта' })
    if (!asset)   return res.status(404).json({ error: 'ОС не найдена', barcode })

    const existing = await prisma.collectionItem.findUnique({
      where:   { sessionId_assetId: { sessionId, assetId: asset.id } },
      include: { asset: { include: ASSET_INCLUDE } },
    })

    // ОС не входит в эту сессию — запрещаем
    if (!existing) {
      return res.status(400).json({
        error: `ОС "${asset.name}" не входит в эту сессию. Сессия создана для: ${session.assetType || 'все ОС'}.`,
        notInSession: true,
        asset,
      })
    }

    // Уже была отсканирована ранее
    if (existing.status !== 'PENDING') {
      return res.json({
        item:           existing,
        asset,
        alreadyScanned: true,
        previousStatus: existing.status,
        returnedAt:     existing.returnedAt,
        returnedBy:     existing.returnedBy,
      })
    }

    const item = await prisma.collectionItem.update({
      where:  { sessionId_assetId: { sessionId, assetId: asset.id } },
      data:   { status, returnedAt: new Date(), returnedBy: returnedBy || null, note: note || null },
      include: { asset: { include: ASSET_INCLUDE } },
    })

    await prisma.collectionItemLog.create({
      data: { itemId: item.id, action: status, performedBy: returnedBy || null, note: note || null },
    })

    res.json({ item, asset, alreadyScanned: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PATCH /api/collection/:id/item/:itemId — обновить статус / примечание
export const updateItem = async (req, res) => {
  try {
    const { status, note, returnedBy } = req.body
    const item = await prisma.collectionItem.update({
      where: { id: Number(req.params.itemId) },
      data: {
        ...(status     && { status }),
        ...(note !== undefined && { note }),
        ...(returnedBy !== undefined && { returnedBy }),
        ...(status === 'RETURNED' || status === 'DAMAGED'
          ? { returnedAt: new Date() }
          : status === 'PENDING' ? { returnedAt: null } : {}),
      },
      include: { asset: { include: ASSET_INCLUDE } },
    })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PATCH /api/collection/:id/item/:itemId/cancel — вернуть в PENDING (требует код)
export const cancelItem = async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Поле code обязательно' })
    if (code.toUpperCase() !== getDeleteCode()) {
      return res.status(403).json({ error: 'Неверный код. Проверьте код на странице бэкенда' })
    }
    const item = await prisma.collectionItem.update({
      where: { id: Number(req.params.itemId) },
      data:  { status: 'PENDING', returnedAt: null, returnedBy: null, note: null },
      include: { asset: { include: ASSET_INCLUDE } },
    })
    await prisma.collectionItemLog.create({
      data: { itemId: item.id, action: 'CANCELLED', performedBy: null, note: null },
    })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PATCH /api/collection/:id — редактировать сессию (название, дедлайн, примечание, принимает)
export const updateSession = async (req, res) => {
  try {
    const { name, deadline, note, createdBy } = req.body
    const session = await prisma.collectionSession.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name      !== undefined && { name }),
        ...(createdBy !== undefined && { createdBy: createdBy || null }),
        ...(note      !== undefined && { note: note || null }),
        ...(deadline  !== undefined && {
          deadline: deadline ? new Date(deadline) : null,
        }),
      },
    })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PATCH /api/collection/:id/close — закрыть сессию
export const closeSession = async (req, res) => {
  try {
    const session = await prisma.collectionSession.update({
      where: { id: Number(req.params.id) },
      data:  { status: 'CLOSED', closedAt: new Date() },
    })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PATCH /api/collection/:id/reopen — открыть закрытую сессию (требует код)
export const reopenSession = async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Поле code обязательно' })
    if (code.toUpperCase() !== getDeleteCode()) {
      return res.status(403).json({ error: 'Неверный код. Проверьте код в /api/collection/code' })
    }
    const session = await prisma.collectionSession.update({
      where: { id: Number(req.params.id) },
      data:  { status: 'OPEN', closedAt: null },
    })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/collection/:id/pending — кто не сдал
export const getPending = async (req, res) => {
  try {
    const items = await prisma.collectionItem.findMany({
      where:   { sessionId: Number(req.params.id), status: 'PENDING' },
      include: { asset: { include: ASSET_INCLUDE } },
      orderBy: { asset: { inventoryNumber: 'asc' } },
    })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/collection/:id/returned — кто сдал
export const getReturned = async (req, res) => {
  try {
    const items = await prisma.collectionItem.findMany({
      where:   { sessionId: Number(req.params.id), status: { in: ['RETURNED', 'DAMAGED'] } },
      include: { asset: { include: ASSET_INCLUDE } },
      orderBy: { returnedAt: 'desc' },
    })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/collection/:id/export — полная ведомость Excel
export const exportSession = async (req, res) => {
  try {
    const session = await prisma.collectionSession.findUnique({
      where:   { id: Number(req.params.id) },
      include: {
        items: {
          include: { asset: { include: ASSET_INCLUDE } },
          orderBy: { asset: { inventoryNumber: 'asc' } },
        },
      },
    })
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })

    const XLSX = await import('xlsx')
    const statusLabel = { PENDING: 'Не сдан', RETURNED: 'Сдан', DAMAGED: 'Повреждён' }

    const rows = session.items.map((item, i) => ({
      '№':                i + 1,
      'Инв. номер':       item.asset.inventoryNumber,
      'Наименование':     item.asset.name,
      'Штрих-код':        item.asset.barcode || '',
      'Сотрудник':        item.asset.employee?.fullName || '—',
      'МОЛ':              item.asset.responsiblePerson?.fullName || '—',
      'Кабинет':          item.asset.location?.name || '—',
      'Статус':           statusLabel[item.status] || item.status,
      'Дата сдачи':       item.returnedAt ? new Date(item.returnedAt).toLocaleString('ru-RU') : '',
      'Принял':           item.returnedBy || '',
      'Примечание':       item.note || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 4 },  { wch: 14 }, { wch: 36 }, { wch: 16 },
      { wch: 26 }, { wch: 26 }, { wch: 20 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 24 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ведомость')

    const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `collection_${session.id}_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/collection/:id/stats/by-location
export const getStatsByLocation = async (req, res) => {
  try {
    const items = await prisma.collectionItem.findMany({
      where:   { sessionId: Number(req.params.id) },
      include: { asset: { select: { location: { select: { name: true } } } } },
    })

    const map = new Map()
    for (const item of items) {
      const loc = item.asset.location?.name ?? 'Без кабинета'
      if (!map.has(loc)) map.set(loc, { location: loc, total: 0, returned: 0, damaged: 0, lost: 0, pending: 0 })
      const s = map.get(loc)
      s.total++
      if (item.status === 'RETURNED') s.returned++
      else if (item.status === 'DAMAGED') s.damaged++
      else if (item.status === 'LOST') s.lost++
      else s.pending++
    }

    const result = Array.from(map.values())
      .map(s => ({
        ...s,
        done: s.returned + s.damaged + s.lost,
        pct:  s.total > 0 ? Math.round(((s.returned + s.damaged + s.lost) / s.total) * 100) : 0,
      }))
      .sort((a, b) => a.location.localeCompare(b.location, 'ru'))

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/collection/:id/export-damaged — Excel только повреждённых
export const exportDamaged = async (req, res) => {
  try {
    const session = await prisma.collectionSession.findUnique({
      where: { id: Number(req.params.id) },
    })
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })

    const items = await prisma.collectionItem.findMany({
      where:   { sessionId: Number(req.params.id), status: 'DAMAGED' },
      include: { asset: { include: ASSET_INCLUDE } },
      orderBy: { asset: { inventoryNumber: 'asc' } },
    })

    const XLSX = await import('xlsx')

    const rows = items.map((item, i) => ({
      '№':            i + 1,
      'Инв. номер':   item.asset.inventoryNumber,
      'Наименование': item.asset.name,
      'Штрих-код':    item.asset.barcode || '',
      'Сотрудник':    item.asset.employee?.fullName || '—',
      'МОЛ':          item.asset.responsiblePerson?.fullName || '—',
      'Кабинет':      item.asset.location?.name || '—',
      'Дата сдачи':   item.returnedAt ? new Date(item.returnedAt).toLocaleString('ru-RU') : '',
      'Принял':       item.returnedBy || '',
      'Примечание':   item.note || '',
      'Подпись':      '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 4 }, { wch: 14 }, { wch: 36 }, { wch: 16 },
      { wch: 26 }, { wch: 26 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 24 }, { wch: 16 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Повреждённые')

    const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `damaged_${session.id}_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/collection/:id/bulk-accept — отметить все PENDING в кабинете как RETURNED
export const bulkAccept = async (req, res) => {
  try {
    const sessionId = Number(req.params.id)
    const { locationName, returnedBy, status = 'RETURNED', code } = req.body

    if (!code) return res.status(400).json({ error: 'Поле code обязательно' })
    if (code.toUpperCase() !== getDeleteCode()) {
      return res.status(403).json({ error: 'Неверный код. Проверьте код в /api/collection/code' })
    }
    if (!locationName) return res.status(400).json({ error: 'Поле locationName обязательно' })
    if (!['RETURNED', 'DAMAGED', 'LOST'].includes(status)) {
      return res.status(400).json({ error: 'status должен быть RETURNED, DAMAGED или LOST' })
    }

    const session = await prisma.collectionSession.findUnique({ where: { id: sessionId } })
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })
    if (session.status === 'CLOSED') return res.status(400).json({ error: 'Сессия закрыта' })

    // Найти все PENDING items в этом кабинете
    const pendingItems = await prisma.collectionItem.findMany({
      where: {
        sessionId,
        status: 'PENDING',
        asset:  { location: { name: locationName } },
      },
      select: { id: true },
    })

    if (pendingItems.length === 0) {
      return res.json({ updated: 0, message: 'Нет позиций для обновления' })
    }

    const ids = pendingItems.map(i => i.id)
    const now = new Date()

    // Batch update (SQLite не поддерживает createMany, используем Promise.all)
    await prisma.collectionItem.updateMany({
      where: { id: { in: ids } },
      data:  { status, returnedAt: now, returnedBy: returnedBy || null },
    })

    // Логируем каждую запись
    const chunks = []
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))
    for (const chunk of chunks) {
      await Promise.all(chunk.map(itemId =>
        prisma.collectionItemLog.create({
          data: { itemId, action: status, performedBy: returnedBy || null, note: `Массовое принятие — ${locationName}` },
        })
      ))
    }

    res.json({ updated: ids.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/collection/:id/clone — клонировать сессию (новая сессия с теми же ОС, все PENDING)
export const cloneSession = async (req, res) => {
  try {
    const sessionId = Number(req.params.id)
    const source = await prisma.collectionSession.findUnique({
      where:   { id: sessionId },
      include: { items: { select: { assetId: true } } },
    })
    if (!source) return res.status(404).json({ error: 'Сессия не найдена' })

    const { name } = req.body
    const clonedName = name || `${source.name} (копия)`

    const newSession = await prisma.collectionSession.create({
      data: {
        name:      clonedName,
        assetType: source.assetType,
        deadline:  source.deadline,
        createdBy: source.createdBy,
        note:      source.note,
        items:     { create: source.items.map(i => ({ assetId: i.assetId, status: 'PENDING' })) },
      },
      include: { _count: { select: { items: true } } },
    })

    res.status(201).json(newSession)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/collection/:id/export-pending — Excel только должников
export const exportPending = async (req, res) => {
  try {
    const session = await prisma.collectionSession.findUnique({
      where: { id: Number(req.params.id) },
    })
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })

    const items = await prisma.collectionItem.findMany({
      where:   { sessionId: Number(req.params.id), status: 'PENDING' },
      include: { asset: { include: ASSET_INCLUDE } },
      orderBy: { asset: { inventoryNumber: 'asc' } },
    })

    const XLSX = await import('xlsx')
    const deadline = session.deadline
      ? new Date(session.deadline).toLocaleDateString('ru-RU')
      : '—'

    const rows = items.map((item, i) => ({
      '№':            i + 1,
      'Инв. номер':   item.asset.inventoryNumber,
      'Наименование': item.asset.name,
      'Штрих-код':    item.asset.barcode || '',
      'Сотрудник':    item.asset.employee?.fullName || '—',
      'МОЛ':          item.asset.responsiblePerson?.fullName || '—',
      'Кабинет':      item.asset.location?.name || '—',
      'Дедлайн':      deadline,
      'Подпись':      '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 4 },  { wch: 14 }, { wch: 36 }, { wch: 16 },
      { wch: 26 }, { wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Не сдали')

    const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `pending_${session.id}_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
