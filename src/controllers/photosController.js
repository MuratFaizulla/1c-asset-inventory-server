import prisma from '../services/prisma.js'

// GET /api/photos — список всех существующих ключей фото
export const getPhotoKeys = async (req, res) => {
  try {
    const photos = await prisma.assetPhoto.findMany({
      select: { nameKey: true }
    })
    res.json(photos.map(p => p.nameKey))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/photos/:nameKey — получить фото из БД и отдать как изображение
export const getPhoto = async (req, res) => {
  try {
    const photo = await prisma.assetPhoto.findUnique({
      where: { nameKey: req.params.nameKey }
    })
    if (!photo) return res.status(404).json({ error: 'Фото не найдено' })

    const buffer = Buffer.from(photo.data, 'base64')
    res.set('Content-Type', photo.mimeType)
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/photos/:nameKey — загрузить или заменить фото по ключу
export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })

    const { nameKey } = req.params
    const assetName = req.body.assetName || nameKey
    const base64 = req.file.buffer.toString('base64')

    const photo = await prisma.assetPhoto.upsert({
      where:  { nameKey },
      create: { nameKey, assetName, mimeType: req.file.mimetype, data: base64 },
      update: { mimeType: req.file.mimetype, data: base64, assetName },
    })

    res.json({ ok: true, id: photo.id, nameKey: photo.nameKey })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/photos/:nameKey — удалить фото по ключу
export const deletePhoto = async (req, res) => {
  try {
    await prisma.assetPhoto.deleteMany({
      where: { nameKey: req.params.nameKey }
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}