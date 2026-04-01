import { Router } from 'express'
import {
  getAssets,
  scanBarcode,
  getGrouped,
  getFaTypes,
  getByNameLocations,
  getAssetById,
  getAssetHistory,
} from '../controllers/assetsController.js'

const router = Router()

// Список всех ОС с фильтрами (search, locationId, responsiblePersonId, organizationId, employeeId) и пагинацией
router.get('/', getAssets)

// Поиск ОС по штрих-коду или инвентарному номеру
router.get('/scan/:barcode', scanBarcode)

// Список уникальных ОС сгруппированных по названию с количеством
router.get('/grouped', getGrouped)

// Уникальные виды ОС (assetFaType) для фильтра инвентаризации
router.get('/fa-types', getFaTypes)

// Разбивка конкретного ОС по кабинетам (сколько штук в каком кабинете)
router.get('/by-name/:name/locations', getByNameLocations)

// Одна ОС по ID с полными связями (location, responsiblePerson, employee, последние 5 инвентаризаций)
router.get('/:id', getAssetById)

// История всех инвентаризаций конкретной ОС
router.get('/:id/history', getAssetHistory)

export default router


// ```

// ---

// Итого структура после этого:
// ```
// src/
// ├── services/
// │   └── prisma.js              ← новый (один раз на весь сервер)
// ├── controllers/
// │   └── assetsController.js    ← новый (вся логика)
// └── routes/
//     └── assets.js              ← заменить (только маршруты)