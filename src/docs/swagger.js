export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'НИШ Инвентаризация — API',
    description:
      'REST API для системы учёта и инвентаризации основных средств.\n' +
      'Разработан для НИШ (Назарбаев Интеллектуальные Школы), Туркестан, Казахстан.\n\n' +
      '**Стек:** Node.js · Express · Prisma ORM · SQLite\n\n' +
      '**Swagger UI:** `/api/docs`  \n**Health check:** `GET /api/health`',
    version: '1.0.0',
    contact: { name: 'Murat Faizulla' },
  },
  servers: [
    { url: 'http://localhost:8888', description: 'Development' },
    { url: 'http://0.0.0.0:8888',  description: 'Production' },
  ],
  tags: [
    { name: 'Health',     description: 'Проверка состояния сервера' },
    { name: 'Assets',     description: 'Основные средства (ОС)' },
    { name: 'Inventory',  description: 'Сессии инвентаризации' },
    { name: 'Import',     description: 'Импорт данных из 1С (Excel)' },
    { name: 'Locations',  description: 'Кабинеты и справочники' },
    { name: 'Stats',      description: 'Дашборд и статистика' },
    { name: 'Photos',     description: 'Фотографии ОС' },
    { name: 'Collection', description: 'Приём техники (сдача ноутбуков и др.)' },
  ],
  components: {
    schemas: {
      // ─── Shared primitives ───────────────────────────────────
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Ресурс не найден' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total:      { type: 'integer', example: 320 },
          page:       { type: 'integer', example: 1 },
          totalPages: { type: 'integer', example: 7 },
        },
      },
      // ─── Reference models ────────────────────────────────────
      Organization: {
        type: 'object',
        properties: {
          id:        { type: 'integer', example: 1 },
          name:      { type: 'string',  example: 'НИШ Туркестан' },
          createdAt: { type: 'string',  format: 'date-time' },
        },
      },
      Location: {
        type: 'object',
        properties: {
          id:        { type: 'integer', example: 5 },
          name:      { type: 'string',  example: 'Кабинет 101' },
          createdAt: { type: 'string',  format: 'date-time' },
        },
      },
      LocationWithCount: {
        type: 'object',
        properties: {
          id:    { type: 'integer', example: 5 },
          name:  { type: 'string',  example: 'Кабинет 101' },
          count: { type: 'integer', example: 24 },
        },
      },
      ResponsiblePerson: {
        type: 'object',
        properties: {
          id:        { type: 'integer', example: 3 },
          fullName:  { type: 'string',  example: 'Иванов Иван Иванович' },
          createdAt: { type: 'string',  format: 'date-time' },
        },
      },
      Employee: {
        type: 'object',
        properties: {
          id:        { type: 'integer', example: 7 },
          fullName:  { type: 'string',  example: 'Петрова Анна Сергеевна' },
          createdAt: { type: 'string',  format: 'date-time' },
        },
      },
      // ─── Asset ───────────────────────────────────────────────
      Asset: {
        type: 'object',
        properties: {
          id:                  { type: 'integer', example: 42 },
          name:                { type: 'string',  example: 'Ноутбук Dell Latitude 5520' },
          assetType:           { type: 'string',  example: 'Техника' },
          assetFaType:         { type: 'string',  example: 'ОС', nullable: true },
          inventoryNumber:     { type: 'string',  example: 'НИШ-00042' },
          barcode:             { type: 'string',  example: '123456789012', nullable: true },
          factoryNumber:       { type: 'string',  example: 'SN-ABCD-1234', nullable: true },
          accountingAccount:   { type: 'string',  example: '101', nullable: true },
          bookValue:           { type: 'number',  example: 350000 },
          residualValue:       { type: 'number',  example: 200000 },
          depreciationPercent: { type: 'number',  example: 42.86 },
          depreciationMonths:  { type: 'integer', example: 36 },
          depreciationEndYear: { type: 'integer', example: 2026 },
          acceptanceDate:      { type: 'string',  format: 'date-time', nullable: true },
          assignmentDate:      { type: 'string',  format: 'date-time', nullable: true },
          createdAt:           { type: 'string',  format: 'date-time' },
          updatedAt:           { type: 'string',  format: 'date-time' },
          organizationId:      { type: 'integer', example: 1 },
          locationId:          { type: 'integer', example: 5 },
          responsiblePersonId: { type: 'integer', example: 3 },
          employeeId:          { type: 'integer', example: 7, nullable: true },
          location:            { $ref: '#/components/schemas/Location' },
          organization:        { $ref: '#/components/schemas/Organization' },
          responsiblePerson:   { $ref: '#/components/schemas/ResponsiblePerson' },
          employee:            { $ref: '#/components/schemas/Employee', nullable: true },
        },
      },
      AssetGrouped: {
        type: 'object',
        properties: {
          name:        { type: 'string',  example: 'Ноутбук Dell Latitude 5520' },
          assetType:   { type: 'string',  example: 'Техника' },
          assetFaType: { type: 'string',  example: 'ОС', nullable: true },
          count:       { type: 'integer', example: 12 },
        },
      },
      AssetByNameLocations: {
        type: 'object',
        properties: {
          name:  { type: 'string', example: 'Ноутбук Dell Latitude 5520' },
          total: { type: 'integer', example: 12 },
          locations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                locationId:   { type: 'integer', example: 5 },
                locationName: { type: 'string',  example: 'Кабинет 101' },
                count:        { type: 'integer', example: 4 },
              },
            },
          },
        },
      },
      // ─── Inventory ───────────────────────────────────────────
      ItemStatus: {
        type: 'string',
        enum: ['PENDING', 'FOUND', 'NOT_FOUND', 'MISPLACED'],
        description:
          'PENDING — не проверена · FOUND — найдена · NOT_FOUND — не найдена · MISPLACED — не на своём месте',
      },
      SessionStatus: {
        type: 'string',
        enum: ['IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'],
      },
      InventoryItem: {
        type: 'object',
        properties: {
          id:        { type: 'integer', example: 100 },
          sessionId: { type: 'integer', example: 2 },
          assetId:   { type: 'integer', example: 42 },
          status:    { $ref: '#/components/schemas/ItemStatus' },
          note:      { type: 'string',  example: 'Перемещён из кабинета 101', nullable: true },
          scannedAt: { type: 'string',  format: 'date-time', nullable: true },
          scannedBy: { type: 'string',  example: 'Иванов', nullable: true },
          asset:     { $ref: '#/components/schemas/Asset' },
        },
      },
      InventorySession: {
        type: 'object',
        properties: {
          id:             { type: 'integer', example: 2 },
          name:           { type: 'string',  example: 'Инвентаризация кабинет 101 — апрель 2026' },
          status:         { $ref: '#/components/schemas/SessionStatus' },
          locationId:     { type: 'integer', example: 5, nullable: true },
          organizationId: { type: 'integer', example: 1, nullable: true },
          assetFaType:    { type: 'string',  example: 'ОС', nullable: true },
          createdBy:      { type: 'string',  example: 'admin', nullable: true },
          startedAt:      { type: 'string',  format: 'date-time' },
          finishedAt:     { type: 'string',  format: 'date-time', nullable: true },
          location:       { $ref: '#/components/schemas/Location', nullable: true },
          organization:   { $ref: '#/components/schemas/Organization', nullable: true },
        },
      },
      SessionStats: {
        type: 'object',
        properties: {
          total:     { type: 'integer', example: 50 },
          found:     { type: 'integer', example: 40 },
          notFound:  { type: 'integer', example: 5 },
          misplaced: { type: 'integer', example: 3 },
          pending:   { type: 'integer', example: 2 },
        },
      },
      ScanResult: {
        type: 'object',
        properties: {
          item:             { $ref: '#/components/schemas/InventoryItem' },
          asset:            { $ref: '#/components/schemas/Asset' },
          status:           { $ref: '#/components/schemas/ItemStatus' },
          alreadyScanned:   { type: 'boolean', example: false },
          isWrongLocation:  { type: 'boolean', example: true },
          expectedLocation: { $ref: '#/components/schemas/Location', nullable: true },
          actualLocation:   { $ref: '#/components/schemas/Location', nullable: true },
          previousScan:     { $ref: '#/components/schemas/InventoryItem', nullable: true },
        },
      },
      StatsByLocation: {
        type: 'object',
        properties: {
          locationId:   { type: 'integer', example: 5 },
          locationName: { type: 'string',  example: 'Кабинет 101' },
          total:        { type: 'integer', example: 20 },
          found:        { type: 'integer', example: 15 },
          notFound:     { type: 'integer', example: 3 },
          misplaced:    { type: 'integer', example: 1 },
          pending:      { type: 'integer', example: 1 },
          assets:       { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
        },
      },
      // ─── Import ──────────────────────────────────────────────
      ImportPreviewResult: {
        type: 'object',
        properties: {
          total:            { type: 'integer', example: 350 },
          skipped:          { type: 'integer', example: 5 },
          unchanged:        { type: 'integer', example: 290 },
          mode:             { type: 'string', enum: ['partial', 'full'], example: 'partial' },
          newAssets:        { type: 'array', items: { $ref: '#/components/schemas/Asset' } },
          changedAssets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                current: { $ref: '#/components/schemas/Asset' },
                changes: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      from: { },
                      to:   { },
                    },
                  },
                },
              },
            },
          },
          unchangedAssets:  { type: 'array', items: { $ref: '#/components/schemas/Asset' } },
          orphaned:         { type: 'array', items: { $ref: '#/components/schemas/Asset' } },
        },
      },
      ImportApplyResult: {
        type: 'object',
        properties: {
          created:   { type: 'integer', example: 10 },
          updated:   { type: 'integer', example: 25 },
          unchanged: { type: 'integer', example: 290 },
          skipped:   { type: 'integer', example: 5 },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                inv:   { type: 'string', example: 'НИШ-00001' },
                error: { type: 'string', example: 'Duplicate inventoryNumber' },
              },
            },
          },
        },
      },
      // ─── Stats ───────────────────────────────────────────────
      DashboardStats: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            properties: {
              totalAssets:        { type: 'integer', example: 1200 },
              totalLocations:     { type: 'integer', example: 48 },
              totalSessions:      { type: 'integer', example: 15 },
              completedSessions:  { type: 'integer', example: 12 },
              inProgressSessions: { type: 'integer', example: 3 },
            },
          },
          depreciation: {
            type: 'object',
            description: 'Группы износа ОС',
            properties: {
              good:    { type: 'integer', description: '0–24%',    example: 400 },
              medium:  { type: 'integer', description: '25–49%',   example: 300 },
              high:    { type: 'integer', description: '50–99%',   example: 200 },
              full:    { type: 'integer', description: '100%+',    example: 100 },
              unknown: { type: 'integer', description: 'нет данных', example: 200 },
            },
          },
          locationStats: {
            type: 'array',
            description: 'Топ-10 кабинетов по числу ОС',
            items: {
              type: 'object',
              properties: {
                name:  { type: 'string',  example: 'Кабинет 101' },
                count: { type: 'integer', example: 45 },
              },
            },
          },
          recentSessions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id:         { type: 'integer' },
                name:       { type: 'string' },
                status:     { $ref: '#/components/schemas/SessionStatus' },
                startedAt:  { type: 'string', format: 'date-time' },
                finishedAt: { type: 'string', format: 'date-time', nullable: true },
                location:   { $ref: '#/components/schemas/Location', nullable: true },
                total:      { type: 'integer' },
                found:      { type: 'integer' },
                notFound:   { type: 'integer' },
                misplaced:  { type: 'integer' },
                pending:    { type: 'integer' },
              },
            },
          },
        },
      },
    },
    // ─── Reusable parameters ─────────────────────────────────────
    parameters: {
      sessionId: {
        name: 'id', in: 'path', required: true,
        schema: { type: 'integer' },
        description: 'ID сессии инвентаризации',
      },
      assetId: {
        name: 'id', in: 'path', required: true,
        schema: { type: 'integer' },
        description: 'ID основного средства',
      },
      itemId: {
        name: 'itemId', in: 'path', required: true,
        schema: { type: 'integer' },
        description: 'ID позиции инвентаризации',
      },
      locationId: {
        name: 'id', in: 'path', required: true,
        schema: { type: 'integer' },
        description: 'ID кабинета',
      },
    },
    // ─── Reusable responses ──────────────────────────────────────
    responses: {
      NotFound: {
        description: 'Ресурс не найден',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      BadRequest: {
        description: 'Неверный запрос',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ServerError: {
        description: 'Внутренняя ошибка сервера',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PATHS
  // ═══════════════════════════════════════════════════════════════
  paths: {

    // ─── Health ──────────────────────────────────────────────────
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Проверка состояния сервера',
        responses: {
          200: {
            description: 'Сервер работает',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status:    { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ─── Assets ──────────────────────────────────────────────────
    '/api/assets': {
      get: {
        tags: ['Assets'],
        summary: 'Список основных средств с фильтрами и пагинацией',
        parameters: [
          { name: 'search',              in: 'query', schema: { type: 'string' },  description: 'Поиск по наименованию, инвентарному номеру, штрих-коду' },
          { name: 'locationId',          in: 'query', schema: { type: 'integer' }, description: 'Фильтр по кабинету' },
          { name: 'responsiblePersonId', in: 'query', schema: { type: 'integer' }, description: 'Фильтр по МОЛ' },
          { name: 'organizationId',      in: 'query', schema: { type: 'integer' }, description: 'Фильтр по организации' },
          { name: 'employeeId',          in: 'query', schema: { type: 'integer' }, description: 'Фильтр по сотруднику' },
          { name: 'page',                in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',               in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'sortBy',              in: 'query', schema: { type: 'string',  default: 'inventoryNumber', enum: ['inventoryNumber', 'name', 'createdAt'] } },
          { name: 'sortDir',             in: 'query', schema: { type: 'string',  default: 'asc', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: {
            description: 'Постраничный список ОС',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Pagination' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/Asset' } },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/assets/scan/{barcode}': {
      get: {
        tags: ['Assets'],
        summary: 'Поиск ОС по штрих-коду или инвентарному номеру',
        parameters: [
          { name: 'barcode', in: 'path', required: true, schema: { type: 'string' }, description: 'Штрих-код или инвентарный номер' },
        ],
        responses: {
          200: {
            description: 'Найденная ОС',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/assets/grouped': {
      get: {
        tags: ['Assets'],
        summary: 'ОС, сгруппированные по наименованию с количеством',
        responses: {
          200: {
            description: 'Список групп',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/AssetGrouped' } },
              },
            },
          },
        },
      },
    },

    '/api/assets/fa-types': {
      get: {
        tags: ['Assets'],
        summary: 'Уникальные значения поля assetFaType (ОС, НМА и т.д.)',
        responses: {
          200: {
            description: 'Массив строк',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'string' }, example: ['ОС', 'НМА'] },
              },
            },
          },
        },
      },
    },

    '/api/assets/by-name/{name}/locations': {
      get: {
        tags: ['Assets'],
        summary: 'Разбивка ОС с данным наименованием по кабинетам',
        parameters: [
          { name: 'name', in: 'path', required: true, schema: { type: 'string' }, description: 'Наименование ОС (URL-encoded)' },
        ],
        responses: {
          200: {
            description: 'Итоги по кабинетам',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AssetByNameLocations' },
              },
            },
          },
        },
      },
    },

    '/api/assets/{id}': {
      get: {
        tags: ['Assets'],
        summary: 'Одна ОС — полные данные + последние 5 инвентаризаций',
        parameters: [{ $ref: '#/components/parameters/assetId' }],
        responses: {
          200: {
            description: 'ОС с данными',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/assets/{id}/history': {
      get: {
        tags: ['Assets'],
        summary: 'Полная история инвентаризаций ОС',
        parameters: [{ $ref: '#/components/parameters/assetId' }],
        responses: {
          200: {
            description: 'Список позиций инвентаризации',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
              },
            },
          },
        },
      },
    },

    // ─── Inventory ───────────────────────────────────────────────
    '/api/inventory': {
      get: {
        tags: ['Inventory'],
        summary: 'Список всех сессий инвентаризации',
        parameters: [
          { name: 'locationId',     in: 'query', schema: { type: 'integer' }, description: 'Фильтр по кабинету' },
          { name: 'organizationId', in: 'query', schema: { type: 'integer' }, description: 'Фильтр по организации' },
          { name: 'status',         in: 'query', schema: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }, description: 'Фильтр по статусу' },
        ],
        responses: {
          200: {
            description: 'Список сессий',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/InventorySession' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Inventory'],
        summary: 'Создать новую сессию инвентаризации',
        description:
          'Создаёт сессию и автоматически добавляет в неё все ОС, ' +
          'подходящие под указанные фильтры (`locationId`, `organizationId`, `assetNames`).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name:           { type: 'string',  example: 'Инвентаризация апрель 2026' },
                  locationId:     { type: 'integer', example: 5,       description: 'Ограничить ОС одним кабинетом' },
                  organizationId: { type: 'integer', example: 1,       description: 'Ограничить ОС одной организацией' },
                  assetNames:     { type: 'array', items: { type: 'string' }, description: 'Белый список наименований ОС' },
                  createdBy:      { type: 'string',  example: 'admin', description: 'Имя пользователя, создавшего сессию' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Сессия создана',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventorySession' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    '/api/inventory/{id}': {
      get: {
        tags: ['Inventory'],
        summary: 'Данные сессии + список позиций + сводная статистика',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Сессия с позициями и статистикой',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/InventorySession' },
                    {
                      type: 'object',
                      properties: {
                        items: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
                        stats: { $ref: '#/components/schemas/SessionStats' },
                      },
                    },
                  ],
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Inventory'],
        summary: 'Обновить метаданные сессии (название, кабинет, организация)',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:           { type: 'string',  example: 'Инвентаризация кабинет 205 — апрель 2026' },
                  locationId:     { type: 'integer', example: 7,  description: 'null — сбросить кабинет' },
                  organizationId: { type: 'integer', example: 1,  description: 'null — сбросить организацию' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Обновлённая сессия',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventorySession' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Inventory'],
        summary: 'Удалить сессию и все её позиции (транзакция)',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Сессия удалена',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { deleted: { type: 'boolean', example: true } } },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/close': {
      patch: {
        tags: ['Inventory'],
        summary: 'Закрыть сессию вручную (статус → CLOSED)',
        description: 'Закрывает активную сессию без изменения статусов ОС. Используйте когда сканирование завершено частично и продолжать не планируется.',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Сессия закрыта',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventorySession' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/cancel': {
      patch: {
        tags: ['Inventory'],
        summary: 'Отменить сессию (статус → CANCELLED)',
        description: 'Нельзя отменить уже завершённую сессию — сначала переоткройте её.',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Сессия отменена',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventorySession' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/reopen': {
      patch: {
        tags: ['Inventory'],
        summary: 'Переоткрыть завершённую или отменённую сессию',
        description: 'Все позиции `NOT_FOUND` возвращаются в `PENDING`. Статус сессии → `IN_PROGRESS`.',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Сессия переоткрыта',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { reopened: { type: 'boolean', example: true } } },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/scan': {
      post: {
        tags: ['Inventory'],
        summary: 'Сканировать штрих-код или инвентарный номер',
        description:
          'Ищет ОС по штрих-коду или инвентарному номеру и обновляет соответствующую позицию сессии. ' +
          'Если ОС найдена в другом кабинете — статус становится `MISPLACED`.',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['barcode'],
                properties: {
                  barcode:   { type: 'string',  example: '123456789012', description: 'Штрих-код или инвентарный номер' },
                  scannedBy: { type: 'string',  example: 'Иванов',       description: 'Кто сканировал' },
                  note:      { type: 'string',  example: 'Найдена в шкафу' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Результат сканирования',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ScanResult' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/add-assets': {
      post: {
        tags: ['Inventory'],
        summary: 'Добавить новые ОС в существующую сессию',
        description: 'Находит ОС, которых ещё нет в сессии (по фильтрам сессии), и добавляет их со статусом `PENDING`.',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'ОС добавлены',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    added:   { type: 'integer', example: 5 },
                    message: { type: 'string',  example: 'Добавлено 5 новых ОС в сессию' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/finish': {
      patch: {
        tags: ['Inventory'],
        summary: 'Завершить сессию',
        description: 'Все позиции со статусом `PENDING` переводятся в `NOT_FOUND`. Статус сессии → `COMPLETED`.',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Сессия завершена',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventorySession' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/relocate-all': {
      patch: {
        tags: ['Inventory'],
        summary: 'Переместить все MISPLACED ОС в кабинет сессии',
        description: 'Обновляет `locationId` у всех ОС со статусом `MISPLACED` на кабинет сессии. Статус позиций → `FOUND`.',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Перемещение выполнено',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    updated:  { type: 'integer', example: 3 },
                    location: { type: 'string',  example: 'Кабинет 101' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    '/api/inventory/{id}/item/{itemId}/check': {
      patch: {
        tags: ['Inventory'],
        summary: 'Переключить отметку "внесено в 1С" (checkedAt)',
        description: 'Если `checkedAt` не установлен — устанавливает текущее время. Если установлен — сбрасывает в `null`.',
        parameters: [
          { $ref: '#/components/parameters/sessionId' },
          { $ref: '#/components/parameters/itemId' },
        ],
        responses: {
          200: {
            description: 'Новое состояние',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id:        { type: 'integer', example: 100 },
                    checkedAt: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/item/{itemId}': {
      patch: {
        tags: ['Inventory'],
        summary: 'Обновить статус и/или примечание позиции',
        parameters: [
          { $ref: '#/components/parameters/sessionId' },
          { $ref: '#/components/parameters/itemId' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { $ref: '#/components/schemas/ItemStatus' },
                  note:   { type: 'string', example: 'Скрытый в шкафу' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Обновлённая позиция',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryItem' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/item/{itemId}/cancel': {
      patch: {
        tags: ['Inventory'],
        summary: 'Отменить сканирование — вернуть позицию в PENDING',
        parameters: [
          { $ref: '#/components/parameters/sessionId' },
          { $ref: '#/components/parameters/itemId' },
        ],
        responses: {
          200: {
            description: 'Позиция сброшена в PENDING',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryItem' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/asset/{assetId}/location': {
      patch: {
        tags: ['Inventory'],
        summary: 'Вручную указать новый кабинет или сотрудника для ОС',
        parameters: [
          { $ref: '#/components/parameters/sessionId' },
          { name: 'assetId', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID основного средства' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  locationId: { type: 'integer', example: 7,         description: 'Новый кабинет' },
                  employeeId: { type: 'integer', example: 12,        description: 'Новый сотрудник' },
                  note:       { type: 'string',  example: 'Перемещена вручную' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'ОС обновлена',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    asset: { $ref: '#/components/schemas/Asset' },
                    note:  { type: 'string' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/misplaced': {
      get: {
        tags: ['Inventory'],
        summary: 'Список ОС не на своём месте (статус MISPLACED)',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Список позиций MISPLACED',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
              },
            },
          },
        },
      },
    },

    '/api/inventory/{id}/relocated': {
      get: {
        tags: ['Inventory'],
        summary: 'Список перемещённых ОС',
        description: 'Позиции со статусом `FOUND`, в примечании которых есть «Перемещ» (охватывает одиночные и массовые перемещения).',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Список перемещённых позиций',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
              },
            },
          },
        },
      },
    },

    '/api/inventory/{id}/stats/by-location': {
      get: {
        tags: ['Inventory'],
        summary: 'Прогресс инвентаризации по кабинетам',
        description: 'Незавершённые кабинеты отображаются первыми. Для каждого — список ОС с их статусами.',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Статистика по кабинетам',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/StatsByLocation' } },
              },
            },
          },
        },
      },
    },

    '/api/inventory/{id}/export': {
      get: {
        tags: ['Inventory'],
        summary: 'Экспорт всей сессии в Excel (.xlsx)',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Excel-файл',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/inventory/{id}/export-relocated': {
      get: {
        tags: ['Inventory'],
        summary: 'Экспорт акта о перемещениях в Excel (.xlsx)',
        parameters: [{ $ref: '#/components/parameters/sessionId' }],
        responses: {
          200: {
            description: 'Excel-файл с перемещениями',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Import ──────────────────────────────────────────────────
    '/api/import/preview': {
      post: {
        tags: ['Import'],
        summary: 'Предпросмотр импорта из Excel — без сохранения изменений',
        description:
          'Разбирает файл выгрузки из 1С и возвращает: новые ОС, изменённые ОС, ' +
          'лишние ОС (есть в БД, но нет в файле). Ничего не сохраняет в БД.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Excel-файл (.xlsx) из 1С' },
                  mode: { type: 'string', enum: ['partial', 'full'], default: 'partial', description: 'partial — только строки файла; full — все ОС в БД' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Результат анализа',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportPreviewResult' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    '/api/import/apply': {
      post: {
        tags: ['Import'],
        summary: 'Применить импорт из Excel — создать и обновить ОС в БД',
        description: 'Сохраняет новые ОС и (опционально) применяет изменения к существующим. Работает батчами по 100.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file:          { type: 'string', format: 'binary', description: 'Excel-файл (.xlsx) из 1С' },
                  applyChanged:  { type: 'boolean', default: false,  description: 'Обновлять существующие ОС при изменениях' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Итоги импорта',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportApplyResult' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    '/api/import/orphaned': {
      delete: {
        tags: ['Import'],
        summary: 'Удалить выбранные лишние ОС из БД',
        description: 'Удаляет ОС, которых нет в текущей выгрузке из 1С. Транзакция: сначала позиции инвентаризации, затем сами ОС.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ids'],
                properties: {
                  ids: { type: 'array', items: { type: 'integer' }, example: [10, 23, 45] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Удалено',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { deleted: { type: 'integer', example: 3 } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    // ─── Locations ───────────────────────────────────────────────
    '/api/locations': {
      get: {
        tags: ['Locations'],
        summary: 'Все кабинеты (по алфавиту)',
        responses: {
          200: {
            description: 'Список кабинетов',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Location' } },
              },
            },
          },
        },
      },
    },

    '/api/locations/with-counts': {
      get: {
        tags: ['Locations'],
        summary: 'Кабинеты с количеством ОС',
        responses: {
          200: {
            description: 'Список кабинетов с числом ОС',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/LocationWithCount' } },
              },
            },
          },
        },
      },
    },

    '/api/locations/organizations': {
      get: {
        tags: ['Locations'],
        summary: 'Справочник организаций',
        responses: {
          200: {
            description: 'Список организаций',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Organization' } },
              },
            },
          },
        },
      },
    },

    '/api/locations/responsible-persons': {
      get: {
        tags: ['Locations'],
        summary: 'Справочник материально ответственных лиц (МОЛ)',
        responses: {
          200: {
            description: 'Список МОЛ',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ResponsiblePerson' } },
              },
            },
          },
        },
      },
    },

    '/api/locations/employees': {
      get: {
        tags: ['Locations'],
        summary: 'Справочник сотрудников',
        responses: {
          200: {
            description: 'Список сотрудников',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
              },
            },
          },
        },
      },
    },

    '/api/locations/{id}/assets': {
      get: {
        tags: ['Locations'],
        summary: 'ОС в конкретном кабинете',
        parameters: [
          { $ref: '#/components/parameters/locationId' },
          { name: 'search',  in: 'query', schema: { type: 'string' }, description: 'Поиск по наименованию или инвентарному номеру' },
          { name: 'sortBy',  in: 'query', schema: { type: 'string', default: 'name', enum: ['name', 'inventoryNumber', 'createdAt'] } },
          { name: 'sortDir', in: 'query', schema: { type: 'string', default: 'asc',  enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: {
            description: 'ОС в кабинете',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    location: { $ref: '#/components/schemas/Location' },
                    assets:   { type: 'array', items: { $ref: '#/components/schemas/Asset' } },
                    total:    { type: 'integer', example: 24 },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Stats ───────────────────────────────────────────────────
    '/api/stats': {
      get: {
        tags: ['Stats'],
        summary: 'Сводная статистика для дашборда',
        description: 'Возвращает итоговые цифры, группы износа, топ-10 кабинетов и последние сессии.',
        responses: {
          200: {
            description: 'Статистика',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardStats' } } },
          },
        },
      },
    },

    // ─── Photos ──────────────────────────────────────────────────
    '/api/photos': {
      get: {
        tags: ['Photos'],
        summary: 'Список всех ключей фотографий (nameKey)',
        responses: {
          200: {
            description: 'Массив ключей',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'string' }, example: ['noutbuk-dell-latitude-5520', 'printer-hp-laserjet'] },
              },
            },
          },
        },
      },
    },

    '/api/photos/{nameKey}': {
      get: {
        tags: ['Photos'],
        summary: 'Получить фото ОС (изображение, кеш 24ч)',
        parameters: [
          { name: 'nameKey', in: 'path', required: true, schema: { type: 'string' }, description: 'Нормализованный ключ наименования ОС' },
        ],
        responses: {
          200: {
            description: 'Изображение',
            content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Photos'],
        summary: 'Загрузить или заменить фото ОС',
        parameters: [
          { name: 'nameKey', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['photo'],
                properties: {
                  photo:     { type: 'string', format: 'binary', description: 'Изображение (только image/*, max 10 MB)' },
                  assetName: { type: 'string', description: 'Оригинальное наименование ОС' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Фото сохранено',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok:      { type: 'boolean', example: true },
                    id:      { type: 'integer', example: 5 },
                    nameKey: { type: 'string',  example: 'noutbuk-dell-latitude-5520' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
      delete: {
        tags: ['Photos'],
        summary: 'Удалить фото ОС',
        parameters: [
          { name: 'nameKey', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Фото удалено',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean', example: true } },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ─── Collection ──────────────────────────────────────────────
    '/api/collection/code': {
      get: {
        tags: ['Collection'],
        summary: 'Текущий код подтверждения (для администратора)',
        description: 'Код меняется каждые 8 часов. Используется для удаления сессий, отмены сканирований и переоткрытия.',
        responses: {
          200: {
            description: 'Код и время до смены',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code:             { type: 'string',  example: '758C51' },
                    expiresInMinutes: { type: 'integer', example: 439 },
                    hint:             { type: 'string',  example: 'Код меняется каждые 8 часов' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/collection': {
      get: {
        tags: ['Collection'],
        summary: 'Список сессий приёма техники',
        responses: {
          200: {
            description: 'Список сессий',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id:        { type: 'integer' },
                      name:      { type: 'string', example: 'Сдача ноутбуков — май 2026' },
                      status:    { type: 'string', enum: ['OPEN', 'CLOSED'] },
                      assetType: { type: 'string', example: 'Ноутбук', nullable: true },
                      deadline:  { type: 'string', format: 'date-time', nullable: true },
                      createdBy: { type: 'string', nullable: true },
                      createdAt: { type: 'string', format: 'date-time' },
                      closedAt:  { type: 'string', format: 'date-time', nullable: true },
                      _count:    { type: 'object', properties: { items: { type: 'integer' } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Collection'],
        summary: 'Создать сессию приёма техники',
        description: 'Создаёт сессию и автоматически добавляет все ОС по фильтру `assetType`.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name:      { type: 'string',  example: 'Сдача ноутбуков — май 2026' },
                  assetType: { type: 'string',  example: 'Ноутбук', description: 'Фильтр по типу ОС' },
                  deadline:  { type: 'string',  format: 'date-time', example: '2026-05-30T18:00:00.000Z' },
                  createdBy: { type: 'string',  example: 'admin' },
                  note:      { type: 'string',  example: 'Учителя уходят в отпуск' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Сессия создана' },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    '/api/collection/{id}': {
      get: {
        tags: ['Collection'],
        summary: 'Данные сессии + позиции + статистика',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Сессия с позициями и stats: { total, returned, damaged, pending }' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Collection'],
        summary: 'Редактировать сессию (название, дедлайн, примечание)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:      { type: 'string',  example: 'Сдача ноутбуков — май 2026' },
                  deadline:  { type: 'string',  format: 'date-time', nullable: true },
                  note:      { type: 'string',  nullable: true },
                  createdBy: { type: 'string',  nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Обновлённая сессия' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Collection'],
        summary: 'Удалить сессию и все позиции (требует code в body)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', example: '758C51', description: 'Код из GET /api/collection/code' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Удалено', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'boolean' } } } } } },
          403: { description: 'Неверный код' },
        },
      },
    },

    '/api/collection/{id}/scan': {
      post: {
        tags: ['Collection'],
        summary: 'Принять технику — сканировать штрих-код или инв. номер',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['barcode'],
                properties: {
                  barcode:    { type: 'string', example: '123456789012' },
                  status:     { type: 'string', enum: ['RETURNED', 'DAMAGED'], default: 'RETURNED' },
                  returnedBy: { type: 'string', example: 'Иванов А.А.' },
                  note:       { type: 'string', example: 'Царапина на крышке' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Результат сканирования' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/collection/{id}/close': {
      patch: {
        tags: ['Collection'],
        summary: 'Закрыть сессию (статус → CLOSED)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Сессия закрыта' } },
      },
    },

    '/api/collection/{id}/reopen': {
      patch: {
        tags: ['Collection'],
        summary: 'Открыть закрытую сессию (требует code)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', example: '758C51', description: 'Код из GET /api/collection/code' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Сессия переоткрыта' },
          403: { description: 'Неверный код' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/collection/{id}/item/{itemId}': {
      patch: {
        tags: ['Collection'],
        summary: 'Обновить статус / примечание позиции',
        parameters: [
          { name: 'id',     in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status:     { type: 'string', enum: ['PENDING', 'RETURNED', 'DAMAGED'] },
                  note:       { type: 'string' },
                  returnedBy: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Обновлённая позиция' } },
      },
    },

    '/api/collection/{id}/item/{itemId}/cancel': {
      patch: {
        tags: ['Collection'],
        summary: 'Отменить — вернуть позицию в PENDING (требует code)',
        parameters: [
          { name: 'id',     in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', example: '758C51', description: 'Код из GET /api/collection/code' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Позиция сброшена в PENDING' },
          403: { description: 'Неверный код' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/collection/{id}/pending': {
      get: {
        tags: ['Collection'],
        summary: 'Список тех кто НЕ сдал технику (статус PENDING)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Список позиций PENDING с данными сотрудника' } },
      },
    },

    '/api/collection/{id}/returned': {
      get: {
        tags: ['Collection'],
        summary: 'Список тех кто сдал технику (RETURNED + DAMAGED)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Список принятых позиций' } },
      },
    },

    '/api/collection/{id}/export': {
      get: {
        tags: ['Collection'],
        summary: 'Экспорт полной ведомости в Excel',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Excel файл',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } },
          },
        },
      },
    },

    '/api/collection/{id}/export-pending': {
      get: {
        tags: ['Collection'],
        summary: 'Экспорт списка должников в Excel (для распечатки)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Excel файл с должниками + колонка "Подпись"',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } },
          },
        },
      },
    },
  },
}
