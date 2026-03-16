import { Router } from 'express'
import {
  getLocations,
  getLocationsWithCounts,
  getOrganizations,
  getResponsiblePersons,
  getEmployees,
  getLocationAssets,
} from '../controllers/locationsController.js'

const router = Router()

// ВАЖНО: все статичные маршруты — строго до /:id, иначе Express поймает их как id

// Список всех кабинетов
router.get('/', getLocations)

// Все кабинеты с количеством ОС
router.get('/with-counts', getLocationsWithCounts)

// Справочник организаций
router.get('/organizations', getOrganizations)

// Справочник МОЛ (материально ответственных лиц)
router.get('/responsible-persons', getResponsiblePersons)

// Справочник сотрудников
router.get('/employees', getEmployees)

// Все ОС в конкретном кабинете (с поиском и сортировкой)
router.get('/:id/assets', getLocationAssets)

export default router