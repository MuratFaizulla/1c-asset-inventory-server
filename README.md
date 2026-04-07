# НИШ Инвентаризация — Backend API

> REST API для системы учёта и инвентаризации основных средств.  
> Разработан для НИШ (Назарбаев Интеллектуальные Школы), Туркестан, Казахстан.

**Стек:** Node.js · Express · Prisma ORM · SQLite · PM2

---

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Переменные окружения](#переменные-окружения)
- [Swagger UI](#swagger-ui)
- [Структура проекта](#структура-проекта)
- [Модели данных](#модели-данных)
- [API Endpoints](#api-endpoints)
- [Скрипты npm](#скрипты-npm)
- [Деплой](#деплой)
- [Рекомендации](#рекомендации)

---

## Быстрый старт

**Требования:** Node.js >= 18, npm >= 9

```bash
# 1. Клонировать репозиторий
git clone https://github.com/muratfaizulla/1c-asset-inventory-server.git
cd 1c-asset-inventory-server

# 2. Установить зависимости
npm install

# 3. Настроить окружение
cp .env.example .env

# 4. Сгенерировать Prisma Client и применить миграции
npm run db:generate
npm run db:deploy

# 5. Запустить
npm run dev       # разработка (nodemon)
npm start         # продакшн (node)
npm run pm2:start # продакшн через PM2
```

Сервер запустится на `http://localhost:8888`.  
Health check: `GET /api/health`  
Swagger UI: `http://localhost:8888/api/docs`

---

## Переменные окружения

Скопируйте `.env.example` в `.env` и задайте значения:

```env
PORT=8888
NODE_ENV=production
DATABASE_URL="file:./prisma/inventory.db"
```

---

## Swagger UI

Интерактивная документация доступна после запуска сервера:

| URL | Описание |
|---|---|
| `http://localhost:8888/api/docs` | Swagger UI (браузер) |
| `http://localhost:8888/api/docs.json` | OpenAPI 3.0 спецификация (JSON) |

Спецификация хранится в `src/docs/swagger.js` — при добавлении новых эндпоинтов обновляйте её вручную.

---
## Архитектура

<p align="center">
  <img src="./docs/express_server_architecture.svg" alt="Server Architecture" width="800" />
</p>

---

## Структура проекта

```
├── app.js                        # Точка входа (Express, middleware, роуты)
├── ecosystem.config.cjs          # Конфигурация PM2
├── prisma/
│   ├── schema.prisma             # Схема базы данных
│   └── migrations/               # SQL-миграции
└── src/
    ├── controllers/
    │   ├── assetsController.js   # CRUD и поиск ОС
    │   ├── importController.js   # Импорт из Excel (1С)
    │   ├── inventoryController.js# Сессии инвентаризации
    │   ├── locationsController.js# Кабинеты и справочники
    │   ├── photosController.js   # Фотографии ОС
    │   └── statsController.js    # Дашборд / статистика
    ├── routes/                   # Объявление маршрутов
    ├── services/
    │   ├── prisma.js             # Singleton Prisma Client
    │   └── importService.js      # Парсинг Excel + справочники
    └── utils/
        └── importHelpers.js      # parseDate, parseNumber, getChanges
```

---

## Модели данных

| Модель | Назначение | Ключевые поля |
|---|---|---|
| `Organization` | Организация / подразделение | `name` (уникальное) |
| `Location` | Кабинет / помещение | `name` |
| `ResponsiblePerson` | Материально ответственное лицо | `fullName` |
| `Employee` | Сотрудник, за которым закреплена ОС | `fullName` |
| `Asset` | Основное средство | `inventoryNumber`, `barcode` (unique) |
| `InventorySession` | Сессия инвентаризации | `status`: `IN_PROGRESS` · `COMPLETED` · `CANCELLED` |
| `InventoryItem` | Позиция сессии | `status`: `PENDING` · `FOUND` · `NOT_FOUND` · `MISPLACED` |
| `AssetPhoto` | Фото ОС (base64 в БД) | `nameKey` (уникальный) |

---

## API Endpoints

### `/api/assets` — Основные средства

| Метод | Маршрут | Описание |
|---|---|---|
| `GET` | `/api/assets` | Список ОС с фильтрами (`search`, `locationId`, `organizationId`, `employeeId`, `page`, `limit`, `sortBy`, `sortDir`) |
| `GET` | `/api/assets/:id` | Одна ОС с полными связями и последними 5 инвентаризациями |
| `GET` | `/api/assets/:id/history` | Полная история инвентаризаций для ОС |
| `GET` | `/api/assets/scan/:barcode` | Поиск по штрих-коду или инвентарному номеру |
| `GET` | `/api/assets/grouped` | ОС, сгруппированные по наименованию с количеством |
| `GET` | `/api/assets/by-name/:name/locations` | Разбивка ОС по кабинетам |

---

### `/api/inventory` — Инвентаризация

| Метод | Маршрут | Описание |
|---|---|---|
| `GET` | `/api/inventory` | Список всех сессий |
| `POST` | `/api/inventory` | Создать сессию (создаёт items для всех ОС по фильтру) |
| `GET` | `/api/inventory/:id` | Данные сессии + items + stats |
| `DELETE` | `/api/inventory/:id` | Удалить сессию (транзакция: items + session) |
| `POST` | `/api/inventory/:id/scan` | Сканировать штрих-код или инвентарный номер |
| `POST` | `/api/inventory/:id/add-assets` | Добавить новые ОС в существующую сессию |
| `PATCH` | `/api/inventory/:id/finish` | Завершить: `PENDING → NOT_FOUND`, статус → `COMPLETED` |
| `PATCH` | `/api/inventory/:id/reopen` | Переоткрыть: `NOT_FOUND → PENDING`, статус → `IN_PROGRESS` |
| `PATCH` | `/api/inventory/:id/relocate-all` | Переместить все `MISPLACED` в кабинет сессии |
| `PATCH` | `/api/inventory/:id/item/:itemId` | Обновить статус / примечание позиции |
| `PATCH` | `/api/inventory/:id/item/:itemId/cancel` | Отменить сканирование → `PENDING` |
| `PATCH` | `/api/inventory/:id/asset/:assetId/location` | Указать новое место или сотрудника вручную |
| `GET` | `/api/inventory/:id/stats/by-location` | Прогресс по кабинетам (незавершённые вверху) |
| `GET` | `/api/inventory/:id/misplaced` | Список ОС не на своём месте |
| `GET` | `/api/inventory/:id/relocated` | Список перемещённых ОС |
| `GET` | `/api/inventory/:id/export` | Экспорт всей сессии в `.xlsx` |
| `GET` | `/api/inventory/:id/export-relocated` | Экспорт перемещений в `.xlsx` |

---

### `/api/import` — Импорт из 1С (Excel)

| Метод | Маршрут | Описание |
|---|---|---|
| `POST` | `/api/import/preview` | Анализ файла без сохранения: новые / изменённые / лишние ОС |
| `POST` | `/api/import/apply` | Применить изменения (батчами по 100) |
| `DELETE` | `/api/import/orphaned` | Удалить выбранные лишние ОС (транзакция) |

Оба endpoint принимают `multipart/form-data` с полем `file` (`.xlsx`).

---

### `/api/locations` — Кабинеты и справочники

| Метод | Маршрут | Описание |
|---|---|---|
| `GET` | `/api/locations` | Все кабинеты (по алфавиту) |
| `GET` | `/api/locations/with-counts` | Кабинеты с количеством ОС |
| `GET` | `/api/locations/organizations` | Справочник организаций |
| `GET` | `/api/locations/responsible-persons` | Справочник МОЛ |
| `GET` | `/api/locations/employees` | Справочник сотрудников |
| `GET` | `/api/locations/:id/assets` | ОС в конкретном кабинете (поиск + сортировка) |

---

### `/api/photos` — Фотографии ОС

| Метод | Маршрут | Описание |
|---|---|---|
| `GET` | `/api/photos` | Список всех ключей (`nameKey`) |
| `GET` | `/api/photos/:nameKey` | Получить фото как изображение (кеш 24ч) |
| `POST` | `/api/photos/:nameKey` | Загрузить / заменить фото (max 10 MB, только `image/*`) |
| `DELETE` | `/api/photos/:nameKey` | Удалить фото |

---

### `/api/stats` — Дашборд

| Метод | Маршрут | Описание |
|---|---|---|
| `GET` | `/api/stats` | Сводка: всего ОС, кабинетов, сессий, топ-10 кабинетов, группы износа, последние сессии |

---

## Скрипты npm

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск с nodemon (авто-перезагрузка) |
| `npm start` | Запуск напрямую через node |
| `npm run pm2:start` | Запуск через PM2 (env: production) |
| `npm run pm2:stop` | Остановить PM2-процесс |
| `npm run pm2:restart` | Перезапустить PM2-процесс |
| `npm run pm2:logs` | Просмотр логов (`./logs/`) |
| `npm run pm2:monit` | Мониторинг PM2 в реальном времени |
| `npm run db:generate` | Сгенерировать Prisma Client |
| `npm run db:migrate` | Создать и применить новую миграцию (dev) |
| `npm run db:deploy` | Применить миграции без создания (prod) |
| `npm run db:studio` | Открыть Prisma Studio (GUI для БД) |

---

## Деплой

### Windows Server (IIS + iisnode)

1. Установить Node.js >= 18 и [iisnode](https://github.com/azure/iisnode)
2. `npm install --omit=dev`
3. `npm run db:deploy`
4. `web.config` уже включён — он проксирует все запросы на `localhost:8888`
5. Настроить пул приложений IIS: **без управляемого кода**

### Linux (PM2)

```bash
npm install --omit=dev
npm run db:deploy
npm run pm2:start

# Логи
npm run pm2:logs
```

---

## Рекомендации

- **Аутентификация** — API не защищён. Рекомендуется добавить JWT или статический API-ключ для write-операций.
- **Фото** — хранятся как base64 в SQLite. При большом количестве фото рекомендуется хранить файлы на диске, а в БД держать только путь.

---

*Автор: Murat Faizulla*