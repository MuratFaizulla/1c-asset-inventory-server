import { Router } from 'express'
import { getStats } from '../controllers/statsController.js'

const router = Router()

// Данные для дашборда — сводка, износ, топ кабинетов, последние сессии
router.get('/', getStats)

export default router