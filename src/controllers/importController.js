import prisma from '../services/prisma.js'
import { parseAndBuildMaps } from '../services/importService.js'
import { getChanges, humanizeChanges } from '../utils/importHelpers.js'

// POST /api/import/preview — анализирует файл без сохранения, возвращает diff
export const previewImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

    // Режим: partial — частичный (не показывает лишних)
    //         full    — полный (показывает ОС которых нет в файле)
    const mode = req.body.mode || 'partial'

    const { parsed, skipped, total } = await parseAndBuildMaps(req.file.buffer)

    // Загружаем существующие ОС по инвентарным номерам из файла
    const invNumbers = parsed.map(p => p.inventoryNumber)
    const existingAssets = await prisma.asset.findMany({
      where: { inventoryNumber: { in: invNumbers } },
      include: {
        location:          true,
        responsiblePerson: true,
        employee:          true,
      }
    })
    const existingMap = Object.fromEntries(existingAssets.map(a => [a.inventoryNumber, a]))

    const newAssets       = []
    const changedAssets   = []
    const unchangedAssets = []  // ОС которые уже актуальны
    let   unchanged       = 0

    for (const item of parsed) {
      const existing = existingMap[item.inventoryNumber]

      if (!existing) {
        // Новая ОС — ещё не в базе
        newAssets.push({
          inventoryNumber: item.inventoryNumber,
          name:            item.name,
          location:        item._locationName,
          mol:             item._molName,
          employee:        item._employeeName !== '—' ? item._employeeName : null,
        })
      } else {
        // Существующая ОС — проверяем изменения
        const changes = getChanges(existing, item)

        if (changes.length === 0) {
          // Уже актуальная — ничего менять не нужно
          unchanged++
          unchangedAssets.push({
            inventoryNumber: item.inventoryNumber,
            name:            item.name,
            location:        item._locationName,
            mol:             item._molName,
            employee:        item._employeeName !== '—' ? item._employeeName : null,
          })
          continue
        }

        const humanChanges = humanizeChanges(changes, existing, item)

        if (humanChanges.length === 0) {
          // Технические изменения ID но human-readable одинаковое — считаем как актуальную
          unchanged++
          unchangedAssets.push({
            inventoryNumber: item.inventoryNumber,
            name:            item.name,
            location:        item._locationName,
            mol:             item._molName,
            employee:        item._employeeName !== '—' ? item._employeeName : null,
          })
          continue
        }

        changedAssets.push({
          id:              existing.id,
          inventoryNumber: item.inventoryNumber,
          name:            item.name,
          location:        item._locationName,
          mol:             item._molName,
          employee:        item._employeeName !== '—' ? item._employeeName : null,
          changes:         humanChanges,
        })
      }
    }

    // Лишние — только в полном режиме
    let orphaned = []
    if (mode === 'full') {
      const importedNumbers = new Set(invNumbers)
      const allInDb = await prisma.asset.findMany({
        select: {
          id:              true,
          inventoryNumber: true,
          name:            true,
          location:          { select: { name: true } },
          responsiblePerson: { select: { fullName: true } },
        }
      })
      orphaned = allInDb
        .filter(a => !importedNumbers.has(a.inventoryNumber))
        .map(a => ({
          id:              a.id,
          inventoryNumber: a.inventoryNumber,
          name:            a.name,
          location:        a.location?.name             || '—',
          mol:             a.responsiblePerson?.fullName || '—',
        }))
    }

    res.json({
      total,
      skipped,
      unchanged,
      mode,
      newAssets,
      changedAssets,
      unchangedAssets,  // список актуальных ОС для отображения
      orphaned,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/import/apply — применяет изменения после подтверждения пользователем
export const applyImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

    const applyChanged = req.body.applyChanged !== 'false'
    const { parsed, skipped } = await parseAndBuildMaps(req.file.buffer)

    const invNumbers = parsed.map(p => p.inventoryNumber)
    const existingAssets = await prisma.asset.findMany({
      where: { inventoryNumber: { in: invNumbers } }
    })
    const existingMap = Object.fromEntries(existingAssets.map(a => [a.inventoryNumber, a]))

    let created = 0, updated = 0, unchanged = 0
    const errors = []

    // Обрабатываем батчами по 100 — не перегружаем БД
    const BATCH = 100
    for (let i = 0; i < parsed.length; i += BATCH) {
      const batch = parsed.slice(i, i + BATCH)
      await Promise.all(batch.map(async data => {
        // Убираем временные поля — они не пишутся в БД
        const { _locationName, _molName, _employeeName, ...dbData } = data
        try {
          const existing = existingMap[data.inventoryNumber]
          if (!existing) {
            // Создаём новую ОС
            await prisma.asset.create({ data: dbData })
            created++
          } else {
            const changes = getChanges(existing, data)
            if (changes.length === 0) { unchanged++; return }
            if (!applyChanged)        { unchanged++; return }
            // Обновляем изменившуюся ОС
            await prisma.asset.update({ where: { id: existing.id }, data: dbData })
            updated++
          }
        } catch (err) {
          errors.push({ inv: data.inventoryNumber, error: err.message })
        }
      }))
    }

    res.json({ created, updated, unchanged, skipped, errors })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/import/orphaned — удаляет выбранные пользователем "лишние" ОС
export const deleteOrphaned = async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !ids.length) return res.status(400).json({ error: 'Нет ids' })

    // Транзакция: сначала удаляем связанные инвентаризации, потом сами ОС
    const [, deleted] = await prisma.$transaction([
      prisma.inventoryItem.deleteMany({ where: { assetId: { in: ids } } }),
      prisma.asset.deleteMany({ where: { id: { in: ids } } }),
    ])

    res.json({ deleted: deleted.count })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}