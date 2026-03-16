import { Router } from 'express'
import multer from 'multer'
import { previewImport, applyImport, deleteOrphaned } from '../controllers/importController.js'

const router = Router()

// Multer — храним файл в памяти, не пишем на диск
const upload = multer({ storage: multer.memoryStorage() })

// Анализ Excel-файла без сохранения — возвращает новые, изменённые и лишние ОС
router.post('/preview', upload.single('file'), previewImport)

// Применение изменений после подтверждения пользователем
router.post('/apply', upload.single('file'), applyImport)

// Удаление выбранных "лишних" ОС (которых нет в загруженном файле)
router.delete('/orphaned', deleteOrphaned)

export default router
// ```

// ---

// Итоговая структура для этого модуля:
// ```
// src/
// ├── utils/
// │   └── importHelpers.js      ← parseDate, parseNumber, getChanges, humanizeChanges
// ├── services/
// │   ├── prisma.js             ← уже есть
// │   └── importService.js      ← parseAndBuildMaps (работа с Excel + справочники)
// ├── controllers/
// │   └── importController.js   ← previewImport, applyImport, deleteOrphaned
// └── routes/
//     └── importRoutes.js       ← только маршруты