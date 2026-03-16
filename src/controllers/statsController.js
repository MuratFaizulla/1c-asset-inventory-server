import prisma from '../services/prisma.js'

// GET /api/stats — данные для дашборда
export const getStats = async (req, res) => {
  try {
    const [
      totalAssets,
      totalLocations,
      sessions,
      assetsByLocation,
      depreciationGroups,
      recentSessions,
    ] = await Promise.all([
      // Общее количество ОС
      prisma.asset.count(),

      // Общее количество кабинетов
      prisma.location.count(),

      // Все сессии для подсчёта статусов
      prisma.inventorySession.findMany({
        include: { _count: { select: { items: true } } }
      }),

      // Топ-10 кабинетов по количеству ОС
      prisma.asset.groupBy({
        by: ['locationId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Все ОС для расчёта групп износа
      prisma.asset.findMany({
        select: { depreciationPercent: true }
      }),

      // Последние 5 сессий с прогрессом по статусам
      prisma.inventorySession.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: {
          location: true,
          organization: true,
          items: { select: { status: true } }
        }
      }),
    ])

    // Считаем статусы сессий
    const totalSessions     = sessions.length
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length
    const inProgressSessions = sessions.filter(s => s.status === 'IN_PROGRESS').length

    // Распределяем ОС по группам износа
    const deprStats = { good: 0, medium: 0, high: 0, full: 0, unknown: 0 }
    for (const a of depreciationGroups) {
      const p = a.depreciationPercent
      if (p === null)  deprStats.unknown++
      else if (p < 25)  deprStats.good++
      else if (p < 50)  deprStats.medium++
      else if (p < 100) deprStats.high++
      else              deprStats.full++
    }

    // Подтягиваем названия кабинетов для топ-10
    const locationIds  = assetsByLocation.map(a => a.locationId)
    const locationNames = await prisma.location.findMany({
      where:  { id: { in: locationIds } },
      select: { id: true, name: true }
    })
    const locMap = Object.fromEntries(locationNames.map(l => [l.id, l.name]))

    const locationStats = assetsByLocation.map(a => ({
      name:  locMap[a.locationId] || 'Не указано',
      count: a._count.id,
    }))

    // Формируем последние сессии с прогрессом
    const recentWithStats = recentSessions.map(s => ({
      id:         s.id,
      name:       s.name,
      status:     s.status,
      startedAt:  s.startedAt,
      finishedAt: s.finishedAt,
      location:   s.location?.name || s.organization?.name || 'Вся организация',
      total:      s.items.length,
      found:      s.items.filter(i => i.status === 'FOUND').length,
      notFound:   s.items.filter(i => i.status === 'NOT_FOUND').length,
      misplaced:  s.items.filter(i => i.status === 'MISPLACED').length,
      pending:    s.items.filter(i => i.status === 'PENDING').length,
    }))

    res.json({
      summary: {
        totalAssets,
        totalLocations,
        totalSessions,
        completedSessions,
        inProgressSessions,
      },
      depreciation:   deprStats,
      locationStats,
      recentSessions: recentWithStats,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}