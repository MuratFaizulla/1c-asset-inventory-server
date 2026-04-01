import prisma from '../services/prisma.js'

export const getSessions = async (req, res) => {
  try {
    const sessions = await prisma.inventorySession.findMany({
      include: {
        location: true,
        organization: true,
        _count: { select: { items: true } }
      },
      orderBy: { startedAt: 'desc' }
    })
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createSession = async (req, res) => {
  try {
    const { name, locationId, organizationId, assetNames, createdBy } = req.body
    // assetNames — массив наименований, либо undefined (все ОС)
    const namesArr = Array.isArray(assetNames) && assetNames.length > 0 ? assetNames : null

    const whereAssets = {}
    if (locationId)     whereAssets.locationId     = Number(locationId)
    if (organizationId) whereAssets.organizationId = Number(organizationId)
    if (namesArr)       whereAssets.name           = { in: namesArr }

    const assets = await prisma.asset.findMany({ where: whereAssets, select: { id: true } })

    const session = await prisma.inventorySession.create({
      data: {
        name,
        locationId:     locationId     ? Number(locationId)     : null,
        organizationId: organizationId ? Number(organizationId) : null,
        assetFaType:    namesArr       ? JSON.stringify(namesArr) : null,
        createdBy,
        items: { create: assets.map(a => ({ assetId: a.id, status: 'PENDING' })) }
      },
      include: {
        location: true,
        organization: true,
        _count: { select: { items: true } }
      }
    })

    res.status(201).json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getSessionById = async (req, res) => {
  try {
    const session = await prisma.inventorySession.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        location: true,
        organization: true,
        items: {
          include: {
            asset: {
              include: { location: true, responsiblePerson: true, employee: true }
            }
          },
          orderBy: { asset: { inventoryNumber: 'asc' } }
        }
      }
    })

    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })

    const stats = {
      total:     session.items.length,
      found:     session.items.filter(i => i.status === 'FOUND').length,
      notFound:  session.items.filter(i => i.status === 'NOT_FOUND').length,
      misplaced: session.items.filter(i => i.status === 'MISPLACED').length,
      pending:   session.items.filter(i => i.status === 'PENDING').length,
    }

    res.json({ ...session, stats })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ИСПРАВЛЕНО: session + asset грузим параллельно → экономим ~100-150ms на каждом скане

export const scanItem = async (req, res) => {
  try {
    const { barcode, scannedBy, note } = req.body
    const sessionId = Number(req.params.id)

    const [session, asset] = await Promise.all([
      prisma.inventorySession.findUnique({
        where: { id: sessionId },
        include: { location: true }
      }),
      prisma.asset.findFirst({
        where: { OR: [{ barcode }, { inventoryNumber: barcode }] },
        include: { location: true, responsiblePerson: true, employee: true }
      })
    ])

    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })
    if (!asset)   return res.status(404).json({ error: 'ОС не найдено в базе', barcode })

    // Проверяем — уже отсканирован в этой сессии?
    const existing = await prisma.inventoryItem.findUnique({
      where: { sessionId_assetId: { sessionId, assetId: asset.id } }
    })

    if (existing && existing.status !== 'PENDING') {
      return res.json({
        item:            existing,
        asset,
        status:          existing.status,
        alreadyScanned:  true,
        isWrongLocation: existing.status === 'MISPLACED',
        // ── Данные первого сканирования ──────────────────────────────────
        previousScan: {
          scannedAt:  existing.scannedAt,
          scannedBy:  existing.scannedBy,
          note:       existing.note,
        },
      })
    }

    // Определяем статус
    let status   = 'FOUND'
    let scanNote = note || null
    const isWrongLocation = session.locationId && asset.locationId !== session.locationId

    if (isWrongLocation) {
      status   = 'MISPLACED'
      scanNote = `Найдено в "${session.location?.name}", числится в "${asset.location.name}"`
    }

    const item = await prisma.inventoryItem.upsert({
      where:  { sessionId_assetId: { sessionId, assetId: asset.id } },
      update: { status, note: scanNote, scannedAt: new Date(), scannedBy },
      create: { sessionId, assetId: asset.id, status, note: scanNote, scannedAt: new Date(), scannedBy },
      include: { asset: { include: { location: true } } }
    })

    res.json({
      item,
      asset,
      status,
      alreadyScanned:   false,
      isWrongLocation,
      expectedLocation: asset.location?.name,
      actualLocation:   session.location?.name,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}



export const cancelItem = async (req, res) => {
  try {
    const item = await prisma.inventoryItem.update({
      where:   { id: Number(req.params.itemId) },
      data:    { status: 'PENDING', note: null, scannedAt: null, scannedBy: null },
      include: { asset: { include: { location: true } } }
    })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateItem = async (req, res) => {
  try {
    const { status, note } = req.body
    const item = await prisma.inventoryItem.update({
      where:   { id: Number(req.params.itemId) },
      data: {
        ...(status && { status }),
        ...(note !== undefined && { note }),
      },
      include: { asset: { include: { location: true } } }
    })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateAssetLocation = async (req, res) => {
  try {
    const { locationId, employeeId, note: manualNote } = req.body
    const sessionId = Number(req.params.id)
    const assetId   = Number(req.params.assetId)

    if (!locationId && !employeeId && !manualNote?.trim()) {
      return res.status(400).json({ error: 'Укажите locationId, employeeId или note' })
    }

    const noteParts = []

    // Параллельно проверяем кабинет и сотрудника если оба указаны
    const [location, employee] = await Promise.all([
      locationId ? prisma.location.findUnique({ where: { id: Number(locationId) } }) : null,
      employeeId ? prisma.employee.findUnique({ where: { id: Number(employeeId) } }) : null,
    ])

    if (locationId && !location) return res.status(404).json({ error: 'Кабинет не найден' })
    if (employeeId && !employee) return res.status(404).json({ error: 'Сотрудник не найден' })

    if (location) noteParts.push(`Перемещён в "${location.name}"`)
    if (employee) noteParts.push(`Передан сотруднику "${employee.fullName}"`)
    if (manualNote?.trim()) noteParts.push(`Комментарий: ${manualNote.trim()}`)

    const note = noteParts.join(', ')

    await prisma.inventoryItem.updateMany({
      where: { sessionId, assetId },
      data:  { status: 'FOUND', note }
    })

    const asset = await prisma.asset.findUnique({
      where:   { id: assetId },
      include: { location: true, responsiblePerson: true, employee: true }
    })

    res.json({ asset, note })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ИСПРАВЛЕНО: оба запроса в одной транзакции — атомарно и быстрее
export const finishSession = async (req, res) => {
  try {
    const sessionId = Number(req.params.id)

    const [, session] = await prisma.$transaction([
      // Все PENDING → NOT_FOUND
      prisma.inventoryItem.updateMany({
        where: { sessionId, status: 'PENDING' },
        data:  { status: 'NOT_FOUND' }
      }),
      // Сессия → COMPLETED
      prisma.inventorySession.update({
        where: { id: sessionId },
        data:  { status: 'COMPLETED', finishedAt: new Date() }
      })
    ])

    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const relocateAll = async (req, res) => {
  try {
    const sessionId = Number(req.params.id)

    const session = await prisma.inventorySession.findUnique({
      where:   { id: sessionId },
      include: { location: true }
    })
    if (!session?.locationId) {
      return res.status(400).json({ error: 'У сессии не указан кабинет' })
    }

    const misplacedItems = await prisma.inventoryItem.findMany({
      where:   { sessionId, status: 'MISPLACED' },
      include: { asset: true }
    })
    if (misplacedItems.length === 0) return res.json({ updated: 0 })

    const assetIds = misplacedItems.map(i => i.assetId)

    // Оба обновления в одной транзакции — либо оба, либо ничего
    await prisma.$transaction([
      prisma.asset.updateMany({
        where: { id: { in: assetIds } },
        data:  { locationId: session.locationId }
      }),
      prisma.inventoryItem.updateMany({
        where: { sessionId, status: 'MISPLACED' },
        data:  { status: 'FOUND', note: `Перемещены в "${session.location?.name}"` }
      })
    ])

    res.json({ updated: misplacedItems.length, location: session.location?.name })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getRelocated = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { sessionId: Number(req.params.id), note: { contains: 'Перемещён' } },
      include: {
        asset: {
          include: { location: true, responsiblePerson: true, employee: true, organization: true }
        }
      }
    })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ИСПРАВЛЕНО: фильтр по status: 'MISPLACED' вместо note startsWith
export const getMisplaced = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { sessionId: Number(req.params.id), status: 'MISPLACED' },
      include: {
        asset: {
          include: { location: true, responsiblePerson: true, employee: true }
        }
      }
    })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const exportSession = async (req, res) => {
  try {
    const session = await prisma.inventorySession.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        location: true,
        organization: true,
        items: {
          include: {
            asset: {
              include: { location: true, responsiblePerson: true, employee: true }
            }
          },
          orderBy: { asset: { inventoryNumber: 'asc' } }
        }
      }
    })
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })

    const XLSX = await import('xlsx')
    const statusLabel = {
      FOUND:     'Найден',
      NOT_FOUND: 'Не найден',
      MISPLACED: 'Не на месте',
      PENDING:   'Не проверен'
    }

    const rows = session.items.map((item, i) => ({
      '№':                      i + 1,
      'Инв. номер':             item.asset.inventoryNumber,
      'Наименование':           item.asset.name,
      'Штрих-код':              item.asset.barcode || '',
      'Местонахождение (план)': item.asset.location?.name || '',
      'МОЛ':                    item.asset.responsiblePerson?.fullName || '',
      'Сотрудник':              item.asset.employee?.fullName || '',
      'Статус':                 statusLabel[item.status] || item.status,
      'Примечание':             item.note || '',
      'Дата сканирования':      item.scannedAt ? new Date(item.scannedAt).toLocaleString('ru-RU') : '',
      'Кто сканировал':         item.scannedBy || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 4 },  { wch: 14 }, { wch: 40 }, { wch: 18 },
      { wch: 25 }, { wch: 22 }, { wch: 22 },
      { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Инвентаризация')

    const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `inv_${session.id}_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const exportRelocated = async (req, res) => {
  try {
    const relocated = await prisma.inventoryItem.findMany({
      where: {
        sessionId: Number(req.params.id),
        note:      { startsWith: 'Перемещён' },
      },
      include: {
        asset: {
          include: { location: true, responsiblePerson: true, employee: true, organization: true }
        }
      },
      orderBy: { asset: { inventoryNumber: 'asc' } }
    })

    const XLSX = await import('xlsx')
    const rows = relocated.map((item, i) => ({
      '№':                     i + 1,
      'Инвентарный номер':     item.asset.inventoryNumber,
      'Штрих-код':             item.asset.barcode || '',
      'Наименование ОС':       item.asset.name,
      'Организация':           item.asset.organization?.name || '',
      'МОЛ':                   item.asset.responsiblePerson?.fullName || '',
      'Сотрудник':             item.asset.employee?.fullName || '',
      'По данным 1С (откуда)': item.asset.location?.name || '',
      'Переместить в (куда)':  (item.note?.match(/Перемещён в "(.+)"/)?.[1]) || '',
      'Счет учета БУ':         item.asset.accountingAccount || '',
      'Примечание':            item.note || '',
      'Дата изменения':        item.scannedAt
                                 ? new Date(item.scannedAt).toLocaleDateString('ru-RU')
                                 : new Date().toLocaleDateString('ru-RU'),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 4 },  { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 20 },
      { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 14 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Перемещения')

    const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `relocations_${req.params.id}_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteSession = async (req, res) => {
  try {
    const sessionId = Number(req.params.id)

    // Оба удаления в транзакции — атомарно
    await prisma.$transaction([
      prisma.inventoryItem.deleteMany({ where: { sessionId } }),
      prisma.inventorySession.delete({ where: { id: sessionId } })
    ])

    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}



// POST /api/inventory/:id/add-assets — добавить новые ОС в существующую сессию
export const addAssetsToSession = async (req, res) => {
  try {
    const sessionId = Number(req.params.id)

    const session = await prisma.inventorySession.findUnique({
      where: { id: sessionId },
      include: { items: { select: { assetId: true } } }
    })
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' })
    if (session.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Сессия уже завершена' })
    }

    // ID ОС которые уже есть в сессии
    const existingAssetIds = new Set(session.items.map(i => i.assetId))

    // Фильтр такой же как при создании сессии
    const whereAssets = {}
    if (session.locationId)     whereAssets.locationId     = session.locationId
    if (session.organizationId) whereAssets.organizationId = session.organizationId
    if (session.assetFaType) {
      try {
        const arr = JSON.parse(session.assetFaType)
        if (Array.isArray(arr) && arr.length > 0) whereAssets.name = { in: arr }
      } catch {
        whereAssets.name = session.assetFaType
      }
    }

    const allAssets = await prisma.asset.findMany({
      where: whereAssets,
      select: { id: true }
    })

    // Только новые — которых ещё нет в сессии
    const newAssets = allAssets.filter(a => !existingAssetIds.has(a.id))

    if (newAssets.length === 0) {
      return res.json({ added: 0, message: 'Нет новых ОС для добавления' })
    }

    // SQLite не поддерживает createMany — создаём по одному
    for (const a of newAssets) {
      try {
        await prisma.inventoryItem.create({
          data: { sessionId, assetId: a.id, status: 'PENDING' }
        })
      } catch (e) {
        // пропускаем дубли
      }
    }

    res.json({
      added:   newAssets.length,
      message: `Добавлено ${newAssets.length} новых ОС в сессию`
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}



// GET /api/inventory/:id/stats/by-location
export const getStatsByLocation = async (req, res) => {
  try {
    const sessionId = Number(req.params.id)

    const items = await prisma.inventoryItem.findMany({
      where:   { sessionId },
      include: {
        asset: {
          include: {
            location:          true,
            responsiblePerson: true,
            employee:          true,
          }
        }
      }
    })

    const map = new Map()

    for (const item of items) {
      const locName = item.asset.location?.name || 'Не указано'
      const locId   = item.asset.locationId     || 0

      if (!map.has(locId)) {
        map.set(locId, {
          locationId:   locId,
          locationName: locName,
          total:        0,
          found:        0,
          notFound:     0,
          misplaced:    0,
          pending:      0,
          // массивы для каждого статуса
          totalAssets:    [],
          foundAssets:    [],
          notFoundAssets: [],
          misplacedAssets:[],
          pendingAssets:  [],
        })
      }

      const s = map.get(locId)
      s.total++

      // Общие поля для любого актива
      const assetInfo = {
        id:                item.asset.id,
        itemId:            item.id,
        name:              item.asset.name,
        inventoryNumber:   item.asset.inventoryNumber,
        barcode:           item.asset.barcode ?? null,
        responsiblePerson: item.asset.responsiblePerson?.fullName ?? null,
        employee:          item.asset.employee?.fullName ?? null,
        // поля инвентаризации
        scannedAt:         item.scannedAt ?? null,
        scannedBy:         item.scannedBy ?? null,
        note:              item.note ?? null,
      }

      s.totalAssets.push(assetInfo)

      if (item.status === 'FOUND')     { s.found++;    s.foundAssets.push(assetInfo) }
      if (item.status === 'NOT_FOUND') { s.notFound++; s.notFoundAssets.push(assetInfo) }
      if (item.status === 'MISPLACED') { s.misplaced++;s.misplacedAssets.push(assetInfo) }
      if (item.status === 'PENDING')   { s.pending++;  s.pendingAssets.push(assetInfo) }
    }

    const result = [...map.values()]
      .map(s => ({
        ...s,
        progress: Math.round(
          ((s.found + s.notFound + s.misplaced) / s.total) * 100
        ),
      }))
      // 100% — вниз, остальные сортируем по убыванию total
      .sort((a, b) => {
        if (a.progress === 100 && b.progress !== 100) return 1
        if (b.progress === 100 && a.progress !== 100) return -1
        return b.total - a.total
      })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}





//PATCH /:id/reopen — переоткрыть завершённую сессию Бывает нужно когда завершили случайно.
export const reopenSession = async (req, res) => {
  try {
    const sessionId = Number(req.params.id)

    // Возвращаем все NOT_FOUND обратно в PENDING
    await prisma.$transaction([
      prisma.inventoryItem.updateMany({
        where: { sessionId, status: 'NOT_FOUND' },
        data:  { status: 'PENDING' }
      }),
      prisma.inventorySession.update({
        where: { id: sessionId },
        data:  { status: 'IN_PROGRESS', finishedAt: null }
      })
    ])

    res.json({ reopened: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}