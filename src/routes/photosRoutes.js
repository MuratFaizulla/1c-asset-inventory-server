import { Router } from 'express'
import multer from 'multer'
import { getPhotoKeys, getPhoto, uploadPhoto, deletePhoto } from '../controllers/photosController.js'

const router = Router()

// Multer — только изображения, максимум 10MB, хранение в памяти
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Только изображения'))
  }
})

// Список всех ключей фото
router.get('/', getPhotoKeys)

// Получить фото как изображение по ключу
router.get('/:nameKey', getPhoto)

// Загрузить или заменить фото по ключу
router.post('/:nameKey', upload.single('photo'), uploadPhoto)

// Удалить фото по ключу
router.delete('/:nameKey', deletePhoto)

export default router