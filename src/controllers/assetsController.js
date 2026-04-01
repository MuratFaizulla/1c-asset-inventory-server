import prisma from '../services/prisma.js'

// GET /api/assets
export const getAssets = async (req, res) => {
  try {
    const {
      search,
      locationId,
      responsiblePersonId,
      organizationId,
      employeeId,
      page = 1,
      limit = 50,
      sortBy = 'inventoryNumber',
      sortDir = 'asc'
    } = req.query

    const where = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { inventoryNumber: { contains: search } },
        { barcode: { contains: search } },
        { factoryNumber: { contains: search } },
      ]
    }
    if (locationId)           where.locationId           = Number(locationId)
    if (responsiblePersonId)  where.responsiblePersonId  = Number(responsiblePersonId)
    if (organizationId)       where.organizationId       = Number(organizationId)
    if (employeeId)           where.employeeId           = Number(employeeId)

    const dir = sortDir === 'desc' ? 'desc' : 'asc'
    let orderBy = { inventoryNumber: dir }
    if (sortBy === 'name')     orderBy = { name: dir }
    else if (sortBy === 'location') orderBy = { location: { name: dir } }
    else if (sortBy === 'mol')      orderBy = { responsiblePerson: { fullName: dir } }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        include: {
          location: true,
          responsiblePerson: true,
          organization: true,
          employee: true,
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy,
      })
    ])

    res.json({
      data: assets,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/assets/scan/:barcode
export const scanBarcode = async (req, res) => {
  try {
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { barcode: req.params.barcode },
          { inventoryNumber: req.params.barcode },
        ]
      },
      include: {
        location: true,
        responsiblePerson: true,
        organization: true,
      }
    })

    if (!asset) {
      return res.status(404).json({ error: 'ОС не найдено', barcode: req.params.barcode })
    }

    res.json(asset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/assets/fa-types — уникальные виды ОС
export const getFaTypes = async (req, res) => {
  try {
    const result = await prisma.asset.findMany({
      where:    { assetFaType: { not: null } },
      select:   { assetFaType: true },
      distinct: ['assetFaType'],
      orderBy:  { assetFaType: 'asc' },
    })
    res.json(result.map(r => r.assetFaType).filter(Boolean))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/assets/grouped
export const getGrouped = async (req, res) => {
  try {
    const grouped = await prisma.asset.groupBy({
      by: ['name'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })

    const names = grouped.map(g => g.name)
    const examples = await prisma.asset.findMany({
      where: { name: { in: names } },
      select: { name: true, assetType: true, assetFaType: true },
      distinct: ['name'],
    })
    const exampleMap = Object.fromEntries(examples.map(e => [e.name, e]))

    res.json(grouped.map(g => ({
      name: g.name,
      assetType: exampleMap[g.name]?.assetType || '',
      assetFaType: exampleMap[g.name]?.assetFaType || null,
      count: g._count.id,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/assets/by-name/:name/locations
export const getByNameLocations = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name)

    const grouped = await prisma.asset.groupBy({
      by: ['locationId'],
      where: { name },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })

    const locationIds = grouped.map(g => g.locationId)
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true }
    })
    const locMap = Object.fromEntries(locations.map(l => [l.id, l.name]))

    res.json({
      name,
      total: grouped.reduce((s, g) => s + g._count.id, 0),
      locations: grouped.map(g => ({
        locationId: g.locationId,
        locationName: locMap[g.locationId] || 'Не указано',
        count: g._count.id,
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/assets/:id
export const getAssetById = async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        location: true,
        responsiblePerson: true,
        organization: true,
        employee: true,
        inventoryItems: {
          include: { session: true },
          orderBy: { scannedAt: 'desc' },
          take: 5
        }
      }
    })

    if (!asset) return res.status(404).json({ error: 'Не найдено' })
    res.json(asset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/assets/:id/history
export const getAssetHistory = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { assetId: Number(req.params.id) },
      include: {
        session: {
          include: { location: true, organization: true }
        }
      },
      orderBy: { scannedAt: 'desc' }
    })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}