import express from 'express'
import path from 'path'
import cors from 'cors'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'

import assetsRouter    from './src/routes/assetsRoutes.js'
import inventoryRouter from './src/routes/inventoryRoutes.js'
import importRouter    from './src/routes/importRoutes.js'
import locationsRouter from './src/routes/locationsRoutes.js'
import statsRouter     from './src/routes/statsRoutes.js'
import photosRouter    from './src/routes/photosRoutes.js'
import { swaggerSpec } from './src/docs/swagger.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 8888
const isDev = process.env.NODE_ENV !== 'production'

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Логгер запросов — только в dev режиме
if (isDev) {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
    next()
  })
}

// ─── Статика ──────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// ─── Swagger UI ───────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'НИШ Инвентаризация — API Docs',
}))
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec))

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/assets',    assetsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/import',    importRouter)
app.use('/api/locations', locationsRouter)
app.use('/api/stats',     statsRouter)
app.use('/api/photos',    photosRouter)

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.url} не найден` })
})

// ─── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500
  if (isDev) console.error(err.stack)
  else console.error(`[ERROR] ${err.message}`)
  res.status(status).json({
    error:   err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  })
})

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT} [${isDev ? 'dev' : 'prod'}]`)
})