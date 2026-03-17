import { Router } from 'express'
import {
  getSessions,
  createSession,
  getSessionById,
  scanItem,
  cancelItem,
  updateItem,
  updateAssetLocation,
  finishSession,
  relocateAll,
  getRelocated,
  getMisplaced,
  exportSession,
  exportRelocated,
  deleteSession,
  addAssetsToSession,
} from '../controllers/inventoryController.js'

const router = Router()

// Список всех сессий инвентаризации
router.get('/', getSessions)

// Создать новую сессию
router.post('/', createSession)

// Сканировать штрих-код или инвентарный номер
router.post('/:id/scan', scanItem)

// Отменить сканирование — вернуть item в PENDING
router.patch('/:id/item/:itemId/cancel', cancelItem)

// Обновить статус или примечание конкретного item
router.patch('/:id/item/:itemId', updateItem)

// Вручную указать новое место или сотрудника для ОС
router.patch('/:id/asset/:assetId/location', updateAssetLocation)

// Завершить сессию — все PENDING становятся NOT_FOUND
router.patch('/:id/finish', finishSession)

// Переместить все MISPLACED в кабинет сессии одним действием
router.patch('/:id/relocate-all', relocateAll)

// Список перемещённых ОС (для экспорта в 1С)
router.get('/:id/relocated', getRelocated)

// Список ОС не на своём месте
router.get('/:id/misplaced', getMisplaced)

// Экспорт всей сессии в Excel
router.get('/:id/export', exportSession)

// Экспорт только перемещённых ОС в Excel
router.get('/:id/export-relocated', exportRelocated)

// ВАЖНО: /:id всегда в конце — иначе Express глотает все маршруты выше
router.get('/:id', getSessionById)

// DELETE тоже в конце
router.delete('/:id', deleteSession)

// Добавить новые ОС которых не было при создании сессии
router.post('/:id/add-assets', addAssetsToSession)

export default router