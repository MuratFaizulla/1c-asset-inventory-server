# Inventory Server

Backend-сервер для учёта и инвентаризации основных средств (ОС).

## Стек технологий

- **Node.js** 18+
- **Express.js** — HTTP-сервер
- **Prisma ORM** — работа с базой данных
- **SQLite / PostgreSQL** — база данных
- **Multer** — загрузка файлов
- **XLSX** — экспорт/импорт Excel
- **PM2** — менеджер процессов в production




## Архитектура

![Architecture](./docs/architecture.svg)

---

## Структура проекта

```
SERVER/
├── src/
│   ├── routes/
│   │   ├── assetsRoutes.js          # маршруты ОС
│   │   ├── inventoryRoutes.js       # маршруты инвентаризации
│   │   ├── importRoutes.js          # маршруты импорта Excel
│   │   ├── locationsRoutes.js       # маршруты кабинетов и справочников
│   │   ├── statsRoutes.js           # маршруты дашборда
│   │   └── photosRoutes.js          # маршруты фотографий
│   ├── controllers/
│   │   ├── assetsController.js      # логика ОС
│   │   ├── inventoryController.js   # логика инвентаризации
│   │   ├── importController.js      # логика импорта
│   │   ├── locationsController.js   # логика кабинетов
│   │   ├── statsController.js       # логика дашборда
│   │   └── photosController.js      # логика фотографий
│   ├── services/
│   │   ├── prisma.js                # единый инстанс PrismaClient
│   │   └── importService.js         # парсинг Excel и справочники
│   └── utils/
│       └── importHelpers.js         # parseDate, parseNumber, getChanges
├── prisma/
│   └── schema.prisma                # схема базы данных
├── uploads/                         # загруженные файлы
├── logs/                            # логи PM2 (создаётся автоматически)
├── app.js                           # точка входа
├── ecosystem.config.cjs             # конфиг PM2
├── .env                             # переменные окружения
├── .env.example                     # шаблон переменных
└── package.json
```

---

## Быстрый старт

### 1. Установить зависимости

```bash
npm install
```

### 2. Создать `.env`

```bash
cp .env.example .env
```

Заполнить `.env`:

```env
PORT=8888
NODE_ENV=production
DATABASE_URL="file:./prisma/dev.db"
```

### 3. Применить миграции

```bash
npm run db:generate
npm run db:migrate
```

### 4. Запуск в development

```bash
npm run dev
```

### 5. Запуск в production через PM2

```bash
npm run pm2:start
```

---

## PM2 — все команды

### Запуск и остановка

```bash
npm run pm2:start      # запустить сервер
npm run pm2:stop       # остановить сервер
npm run pm2:restart    # перезапустить сервер
npm run pm2:delete     # удалить процесс из PM2
```

### Мониторинг

```bash
npm run pm2:list       # список всех процессов и их статус
npm run pm2:logs       # логи в реальном времени
npm run pm2:logs:err   # только логи ошибок
npm run pm2:monit      # мониторинг CPU и памяти в реальном времени
```

### Автозапуск при перезагрузке

**Linux/Mac:**
```bash
pm2 startup            # PM2 выдаст команду — скопировать и выполнить
pm2 save               # сохранить текущие процессы
```

**Windows:**
```bash
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

### Статусы процесса PM2

| Статус | Описание |
|--------|----------|
| `online` | Сервер работает |
| `stopped` | Остановлен вручную |
| `errored` | Упал с ошибкой |
| `launching` | Запускается |

---

## База данных — команды

```bash
npm run db:generate    # сгенерировать Prisma Client после изменений схемы
npm run db:migrate     # создать и применить новую миграцию (dev)
npm run db:deploy      # применить готовые миграции (production)
npm run db:studio      # открыть Prisma Studio — визуальный редактор БД
npm run db:seed        # заполнить БД тестовыми данными
```

---

## Проверка работоспособности

```bash
# Через curl
curl http://localhost:8888/api/health

# Ответ:
# { "status": "ok", "timestamp": "2024-11-15T10:30:00.000Z" }
```

---

## API — все эндпоинты

### Assets `/api/assets`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Список ОС с фильтрами (search, locationId, responsiblePersonId, organizationId, employeeId) и пагинацией |
| GET | `/scan/:barcode` | Поиск ОС по штрих-коду или инвентарному номеру |
| GET | `/grouped` | Уникальные ОС сгруппированные по названию с количеством |
| GET | `/by-name/:name/locations` | Разбивка конкретного ОС по кабинетам |
| GET | `/:id` | Одна ОС с полными связями |
| GET | `/:id/history` | История инвентаризаций конкретной ОС |

**Параметры фильтрации GET `/`:**
```
?search=компьютер
?locationId=1
?responsiblePersonId=2
?organizationId=1
?employeeId=3
?page=1&limit=50
?sortBy=name&sortDir=asc
```

### Inventory `/api/inventory`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Список всех сессий инвентаризации |
| POST | `/` | Создать новую сессию |
| POST | `/:id/scan` | Сканировать штрих-код или инвентарный номер |
| PATCH | `/:id/item/:itemId/cancel` | Отменить сканирование — вернуть в PENDING |
| PATCH | `/:id/item/:itemId` | Обновить статус или примечание item |
| PATCH | `/:id/asset/:assetId/location` | Указать новое место или сотрудника для ОС |
| PATCH | `/:id/finish` | Завершить сессию — все PENDING становятся NOT_FOUND |
| PATCH | `/:id/relocate-all` | Переместить все MISPLACED в кабинет сессии |
| GET | `/:id` | Сессия с полным списком ОС и статистикой прогресса |
| GET | `/:id/relocated` | Список перемещённых ОС для экспорта в 1С |
| GET | `/:id/misplaced` | Список ОС не на своём месте |
| GET | `/:id/export` | Экспорт всей сессии в Excel |
| GET | `/:id/export-relocated` | Экспорт только перемещённых ОС в Excel |
| DELETE | `/:id` | Удалить сессию со всеми записями |

**Статусы ОС в сессии:**
| Статус | Описание |
|--------|----------|
| `PENDING` | Ещё не проверен |
| `FOUND` | Найден на месте |
| `NOT_FOUND` | Не найден |
| `MISPLACED` | Найден в другом кабинете |

### Import `/api/import`

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/preview` | Анализ Excel-файла без сохранения — возвращает новые, изменённые и лишние ОС |
| POST | `/apply` | Применить изменения после подтверждения |
| DELETE | `/orphaned` | Удалить выбранные лишние ОС |

**Поля Excel для импорта:**
```
Инвентарный номер, ОС, Организация, МОЛ, Местонахождение,
Сотрудник, Тип, Тип ФА, Штрих-код, Заводской номер,
Счет учета БУ, Стоимость БУ, Остаточная стоимость,
Процент износа, Срок износа, Год окончания износа,
Дата принятия, Дата закрепления
```

### Locations `/api/locations`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Все кабинеты отсортированные по имени |
| GET | `/with-counts` | Все кабинеты с количеством ОС в каждом |
| GET | `/organizations` | Справочник организаций |
| GET | `/responsible-persons` | Справочник МОЛ |
| GET | `/employees` | Справочник сотрудников |
| GET | `/:id/assets` | Все ОС в конкретном кабинете с поиском и сортировкой |

### Stats `/api/stats`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Данные для дашборда: сводка, группы износа, топ-10 кабинетов, последние 5 сессий |

### Photos `/api/photos`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Список всех ключей фотографий |
| GET | `/:nameKey` | Получить фото как изображение |
| POST | `/:nameKey` | Загрузить или заменить фото (multipart/form-data, поле: photo) |
| DELETE | `/:nameKey` | Удалить фото |

### Health

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка работоспособности сервера |

---

## Деплой на Linux-сервер

### Первый раз

```bash
# 1. Установить Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Установить PM2
npm install -g pm2

# 3. Клонировать репозиторий
git clone <repo> /var/www/inventory-server
cd /var/www/inventory-server

# 4. Установить зависимости
npm install

# 5. Создать .env
cp .env.example .env
nano .env

# 6. Применить миграции
npm run db:generate
npm run db:deploy

# 7. Запустить
npm run pm2:start

# 8. Автозапуск при перезагрузке
pm2 startup
# Скопировать и выполнить команду которую выдаст PM2
pm2 save

# 9. Открыть порт в фаерволе
sudo ufw allow 8888
```

### Обновление кода

```bash
cd /var/www/inventory-server
git pull
npm install
npm run db:deploy
npm run pm2:restart
```

---

## Деплой на Windows (локально)

```bash
# Установить PM2 и автозапуск
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install

# Запустить
npm run pm2:start
pm2 save
```

---

## Диагностика проблем

```bash
# Смотреть логи ошибок
npm run pm2:logs:err

# Проверить порт — не занят ли
# Linux:
sudo lsof -i :8888
# Windows:
netstat -ano | findstr :8888

# Перезапустить с нуля
npm run pm2:delete
npm run pm2:start

# Проверить переменные окружения
pm2 env 0
```

---

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `PORT` | Порт сервера | `8888` |
| `NODE_ENV` | Окружение | `production` / `development` |
| `DATABASE_URL` | Строка подключения к БД | `file:./prisma/dev.db` |

---

## Лицензия

MIT#   1 c - a s s e t - i n v e n t o r y - s e r v e r  
 