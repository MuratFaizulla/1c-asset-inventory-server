import prisma from '../services/prisma.js'

// GET /api/locations — все кабинеты отсортированные по имени
export const getLocations = async (req, res) => {
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } })
    res.json(locations)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/locations/with-counts — все кабинеты с количеством ОС в каждом
export const getLocationsWithCounts = async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { assets: true } } }
    })
    res.json(locations.map(l => ({
      id:    l.id,
      name:  l.name,
      count: l._count.assets,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/locations/organizations — справочник организаций
export const getOrganizations = async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({ orderBy: { name: 'asc' } })
    res.json(orgs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/locations/responsible-persons — справочник МОЛ
export const getResponsiblePersons = async (req, res) => {
  try {
    const persons = await prisma.responsiblePerson.findMany({ orderBy: { fullName: 'asc' } })
    res.json(persons)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/locations/employees — справочник сотрудников
export const getEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { fullName: 'asc' } })
    res.json(employees)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/locations/:id/assets — все ОС в конкретном кабинете с поиском и сортировкой
export const getLocationAssets = async (req, res) => {
  try {
    const { search, sortDir = 'asc' } = req.query
    const locationId = Number(req.params.id)

    const ALLOWED_SORT = ['name', 'inventoryNumber', 'barcode']
    const sortBy = ALLOWED_SORT.includes(req.query.sortBy) ? req.query.sortBy : 'name'
    const dir = sortDir === 'desc' ? 'desc' : 'asc'

    const where = {
      locationId,
      ...(search ? {
        OR: [
          { name:            { contains: search } },
          { inventoryNumber: { contains: search } },
          { barcode:         { contains: search } },
        ]
      } : {})
    }

    const [assets, location, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: { responsiblePerson: true, employee: true },
        orderBy: { [sortBy]: dir }
      }),
      prisma.location.findUnique({ where: { id: locationId } }),
      prisma.asset.count({ where }),
    ])

    res.json({ location, assets, total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}