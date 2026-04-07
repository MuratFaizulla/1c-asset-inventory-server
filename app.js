import express from 'express'
import path from 'path'
import cors from 'cors'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import { readFileSync } from 'fs'

import assetsRouter    from './src/routes/assetsRoutes.js'
import inventoryRouter from './src/routes/inventoryRoutes.js'
import importRouter    from './src/routes/importRoutes.js'
import locationsRouter from './src/routes/locationsRoutes.js'
import statsRouter     from './src/routes/statsRoutes.js'
import photosRouter    from './src/routes/photosRoutes.js'
import { swaggerSpec } from './src/docs/swagger.js'
import prisma          from './src/services/prisma.js'

const { version: APP_VERSION } = JSON.parse(readFileSync('./package.json', 'utf8'))

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 8888
const isDev = process.env.NODE_ENV !== 'production'

// ─── Middleware ───────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173']

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (curl, мобильные приложения, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} не разрешён`))
  }
}))
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

// ─── Landing page ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>НИШ Инвентаризация — API</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0b0d14;color:#e2e8f0;min-height:100vh;padding:32px 16px}
a{color:inherit;text-decoration:none}
.page{max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:20px}

/* Header */
.header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.header-left h1{font-size:22px;font-weight:700;color:#f1f5f9}
.header-left p{font-size:13px;color:#475569;margin-top:2px}
.badge{display:inline-flex;align-items:center;gap:6px;background:#0d2b1a;border:1px solid #166534;color:#4ade80;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:5px 12px;border-radius:20px}
.badge.error{background:#2d1515;border-color:#7f1d1d;color:#f87171}
.dot{width:6px;height:6px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite;flex-shrink:0}
.dot.error{background:#ef4444}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}

/* Stat cards */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.stat-card{background:#131620;border:1px solid #1e2235;border-radius:12px;padding:18px 20px}
.stat-card .label{font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
.stat-card .value{font-size:28px;font-weight:700;color:#f1f5f9;line-height:1}
.stat-card .sub{font-size:11px;color:#334155;margin-top:4px}
.stat-card.blue .value{color:#60a5fa}
.stat-card.green .value{color:#4ade80}
.stat-card.amber .value{color:#fbbf24}
.stat-card.purple .value{color:#a78bfa}

/* Two-col */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:600px){.two-col{grid-template-columns:1fr}}

/* Panel */
.panel{background:#131620;border:1px solid #1e2235;border-radius:12px;padding:20px}
.panel-title{font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px}

/* Memory bar */
.mem-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.mem-label{font-size:13px;color:#94a3b8}
.mem-val{font-size:13px;color:#f1f5f9;font-weight:600;font-family:monospace}
.bar-wrap{background:#0f1117;border-radius:4px;height:8px;overflow:hidden;margin-bottom:16px}
.bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#3b82f6,#6366f1);transition:width .6s ease}
.bar-fill.warn{background:linear-gradient(90deg,#f59e0b,#ef4444)}
.info-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #1e2235;font-size:12px}
.info-row:last-child{border-bottom:none}
.info-row .k{color:#475569}
.info-row .v{color:#94a3b8;font-family:monospace}

/* Modules */
.module-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #1e2235;font-size:13px}
.module-row:last-child{border-bottom:none}
.module-path{color:#7dd3fc;font-family:monospace;font-size:12px}
.module-count{background:#1e2235;color:#64748b;border-radius:10px;font-size:11px;font-weight:600;padding:2px 8px}

/* Sessions */
.session-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #1e2235}
.session-row:last-child{border-bottom:none}
.session-status{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.s-progress{background:#3b82f6}.s-done{background:#22c55e}.s-cancelled{background:#6b7280}
.session-info{flex:1;min-width:0}
.session-name{font-size:13px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.session-meta{font-size:11px;color:#475569;margin-top:2px}
.session-pct{font-size:12px;font-weight:600;color:#64748b;flex-shrink:0}

/* Actions */
.actions{display:flex;flex-wrap:wrap;gap:10px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:9px;font-size:13px;font-weight:500;transition:opacity .15s,transform .15s;cursor:pointer}
.btn:hover{opacity:.85;transform:translateY(-1px)}
.btn-primary{background:#2563eb;color:#fff}
.btn-secondary{background:#131620;color:#94a3b8;border:1px solid #1e2235}
.btn-code{font-family:monospace;font-size:12px;color:#7dd3fc}

/* Footer */
.footer{font-size:11px;color:#334155;text-align:center;padding-top:4px}

/* Skeleton */
.skel{background:#1e2235;border-radius:4px;animation:skel 1.4s infinite}
@keyframes skel{0%,100%{opacity:.5}50%{opacity:1}}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>НИШ Инвентаризация — API</h1>
      <p>Назарбаев Интеллектуальные Школы · Туркестан · v${APP_VERSION}</p>
    </div>
    <div class="badge" id="statusBadge">
      <span class="dot" id="statusDot"></span>
      <span id="statusText">Проверка...</span>
    </div>
  </div>

  <!-- Stat cards -->
  <div class="stats-grid">
    <div class="stat-card blue">
      <div class="label">Основных средств</div>
      <div class="value" id="cntAssets">—</div>
      <div class="sub" id="cntLocations">кабинетов: —</div>
    </div>
    <div class="stat-card green">
      <div class="label">Сессий завершено</div>
      <div class="value" id="cntDone">—</div>
      <div class="sub" id="cntTotal">всего сессий: —</div>
    </div>
    <div class="stat-card amber">
      <div class="label">В процессе</div>
      <div class="value" id="cntProgress">—</div>
      <div class="sub">активных инвентаризаций</div>
    </div>
    <div class="stat-card purple">
      <div class="label">Uptime сервера</div>
      <div class="value" id="uptimeVal" style="font-size:18px;padding-top:4px">—</div>
      <div class="sub" id="pidVal">pid: —</div>
    </div>
  </div>

  <!-- Memory + System info -->
  <div class="two-col">
    <div class="panel">
      <div class="panel-title">Память (heap)</div>
      <div class="mem-row">
        <span class="mem-label">Использовано</span>
        <span class="mem-val" id="heapUsed">— MB</span>
      </div>
      <div class="bar-wrap"><div class="bar-fill" id="heapBar" style="width:0%"></div></div>
      <div class="info-row"><span class="k">Heap total</span><span class="v" id="heapTotal">—</span></div>
      <div class="info-row"><span class="k">RSS</span><span class="v" id="rss">—</span></div>
      <div class="info-row"><span class="k">Node.js</span><span class="v" id="nodeVer">—</span></div>
      <div class="info-row"><span class="k">Режим</span><span class="v" id="envVal">—</span></div>
      <div class="info-row"><span class="k">База данных</span><span class="v" id="dbStatus">—</span></div>
    </div>

    <div class="panel">
      <div class="panel-title">Модули API</div>
      <div class="module-row"><span>/api/assets</span><span class="module-path">/api/assets</span><span class="module-count">7</span></div>
      <div class="module-row"><span>/api/inventory</span><span class="module-path">/api/inventory</span><span class="module-count">16</span></div>
      <div class="module-row"><span>/api/import</span><span class="module-path">/api/import</span><span class="module-count">3</span></div>
      <div class="module-row"><span>/api/locations</span><span class="module-path">/api/locations</span><span class="module-count">6</span></div>
      <div class="module-row"><span>/api/photos</span><span class="module-path">/api/photos</span><span class="module-count">4</span></div>
      <div class="module-row"><span>/api/stats</span><span class="module-path">/api/stats</span><span class="module-count">1</span></div>
      <div class="module-row" style="border-bottom:none"><span style="color:#475569">/api/health</span><span class="module-path">/api/health</span><span class="module-count">1</span></div>
    </div>
  </div>

  <!-- Recent sessions -->
  <div class="panel">
    <div class="panel-title">Последние сессии инвентаризации</div>
    <div id="sessionsList"><div class="skel" style="height:36px;margin-bottom:8px;border-radius:6px"></div><div class="skel" style="height:36px;margin-bottom:8px;border-radius:6px"></div><div class="skel" style="height:36px;border-radius:6px"></div></div>
  </div>

  <!-- Actions -->
  <div class="actions">
    <a class="btn btn-primary" href="/api/docs">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Swagger UI — документация
    </a>
    <a class="btn btn-secondary" href="/api/health">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      Health check
      <span class="btn-code">/api/health</span>
    </a>
    <a class="btn btn-secondary" href="/api/docs.json">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      OpenAPI JSON
      <span class="btn-code">/api/docs.json</span>
    </a>
  </div>

  <div class="footer">Port ${PORT} &nbsp;·&nbsp; ${isDev ? 'development' : 'production'} &nbsp;·&nbsp; Murat Faizulla</div>
</div>

<script>
const $ = id => document.getElementById(id)

async function loadHealth() {
  try {
    const h = await fetch('/api/health').then(r => r.json())
    const ok = h.status === 'ok'
    $('statusBadge').className = 'badge' + (ok ? '' : ' error')
    $('statusDot').className   = 'dot'   + (ok ? '' : ' error')
    $('statusText').textContent = ok ? 'Сервер работает' : 'Деградация'

    $('uptimeVal').textContent = h.uptime || '—'
    $('pidVal').textContent    = 'pid: ' + (h.pid || '—')
    $('nodeVer').textContent   = h.nodeVersion || '—'
    $('envVal').textContent    = h.env || '—'
    $('dbStatus').textContent  = h.db === 'ok' ? '✓ online' : '✗ error'
    $('dbStatus').style.color  = h.db === 'ok' ? '#4ade80' : '#f87171'

    if (h.memory) {
      const pct = h.memory.heapPercent
      $('heapUsed').textContent  = h.memory.heapUsedMB  + ' MB'
      $('heapTotal').textContent = h.memory.heapTotalMB + ' MB'
      $('rss').textContent       = h.memory.rssMB       + ' MB'
      const bar = $('heapBar')
      bar.style.width = pct + '%'
      if (pct > 75) bar.classList.add('warn')
    }
  } catch {
    $('statusText').textContent = 'Недоступен'
    $('statusBadge').className  = 'badge error'
    $('statusDot').className    = 'dot error'
  }
}

async function loadStats() {
  try {
    const s = await fetch('/api/stats').then(r => r.json())
    $('cntAssets').textContent    = (s.summary?.totalAssets    ?? '—').toLocaleString('ru')
    $('cntLocations').textContent = 'кабинетов: ' + (s.summary?.totalLocations ?? '—')
    $('cntDone').textContent      = s.summary?.completedSessions  ?? '—'
    $('cntTotal').textContent     = 'всего сессий: ' + (s.summary?.totalSessions ?? '—')
    $('cntProgress').textContent  = s.summary?.inProgressSessions ?? '—'

    const list = $('sessionsList')
    if (!s.recentSessions?.length) {
      list.innerHTML = '<div style="font-size:13px;color:#334155;padding:8px 0">Нет сессий</div>'
      return
    }
    const statusMap = { IN_PROGRESS: ['s-progress', 'В процессе'], COMPLETED: ['s-done', 'Завершена'], CANCELLED: ['s-cancelled', 'Отменена'] }
    list.innerHTML = s.recentSessions.slice(0, 5).map(ses => {
      const [cls, label] = statusMap[ses.status] || ['s-cancelled', ses.status]
      const pct = ses.total ? Math.round((ses.found + ses.notFound + ses.misplaced) / ses.total * 100) : 0
      const date = ses.startedAt ? new Date(ses.startedAt).toLocaleDateString('ru-RU') : ''
      const loc  = ses.location?.name || ''
      return \`<div class="session-row">
        <span class="session-status \${cls}"></span>
        <div class="session-info">
          <div class="session-name">\${ses.name}</div>
          <div class="session-meta">\${label}\${loc ? ' · ' + loc : ''} · \${date}</div>
        </div>
        <span class="session-pct">\${pct}%</span>
      </div>\`
    }).join('')
  } catch {
    $('sessionsList').innerHTML = '<div style="font-size:13px;color:#334155">Не удалось загрузить</div>'
  }
}

loadHealth()
loadStats()
</script>
</body>
</html>`)
})

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
app.get('/api/health', async (_req, res) => {
  let db = 'ok'
  try { await prisma.$queryRaw`SELECT 1` } catch { db = 'error' }

  const mem   = process.memoryUsage()
  const uptSec = process.uptime()
  const d = Math.floor(uptSec / 86400)
  const h = Math.floor((uptSec % 86400) / 3600)
  const m = Math.floor((uptSec % 3600) / 60)
  const s = Math.floor(uptSec % 60)
  const uptime = d > 0
    ? `${d}д ${h}ч ${m}м`
    : h > 0 ? `${h}ч ${m}м ${s}с` : `${m}м ${s}с`

  res.json({
    status:      db === 'ok' ? 'ok' : 'degraded',
    timestamp:   new Date().toISOString(),
    uptime,
    uptimeSeconds: Math.floor(uptSec),
    version:     APP_VERSION,
    env:         isDev ? 'development' : 'production',
    port:        Number(PORT),
    pid:         process.pid,
    nodeVersion: process.version,
    db,
    memory: {
      heapUsedMB:  Math.round(mem.heapUsed  / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB:       Math.round(mem.rss       / 1024 / 1024),
      heapPercent: Math.round(mem.heapUsed  / mem.heapTotal * 100),
    },
  })
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