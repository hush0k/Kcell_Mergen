# Kcell Mergen — Техническая документация бэкенда

> Внутренняя система управления контролями, задачами и инцидентами АО Kcell.  
> Проект представляет собой полную миграцию legacy Flask-приложения на современный асинхронный стек.

---

## Содержание

1. [Стек технологий](#стек-технологий)
2. [Быстрый старт](#быстрый-старт)
3. [Архитектура](#архитектура)
4. [Схема базы данных](#схема-базы-данных)
5. [API Reference](#api-reference)
    - [Auth](#auth)
    - [User](#user)
    - [Control](#control)
    - [Task](#task)
    - [Vacation Schedule](#vacation-schedule)
    - [Incident](#incident)
    - [MFS Audit Log](#mfs-audit-log)
    - [Notification](#notification)
6. [Фоновые задачи и функции БД](#фоновые-задачи-и-функции-бд)
7. [Скрипты](#скрипты)
8. [Изменения относительно legacy](#изменения-относительно-legacy)

---

## Стек технологий

| Компонент | Технология |
|---|---|
| Язык | Python 3.14 |
| Web-фреймворк | FastAPI |
| ORM | SQLAlchemy 2.0 (async) |
| База данных | PostgreSQL (схема `kcell_web`) |
| Миграции | Alembic |
| Валидация | Pydantic v2 |
| Аутентификация | JWT (PyJWT) |
| Хэширование паролей | Argon2 (passlib + argon2-cffi) |
| Управление пакетами | uv |
| Линтинг | ruff, mypy |
| Тесты | pytest-asyncio |
| Real-time | WebSocket + pg_notify (asyncpg) |
| Планировщик | pg_cron (PostgreSQL) |

---

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/hush0k/kcell_backend.git
cd backend
```

### 2. Установить зависимости

```bash
uv sync
```

### 3. Создать `.env` файл

```bash
cp .example.env .env
```

Заполнить переменные окружения.

### 4. Применить миграции

```bash
./scripts/migrate.sh "init"
```

### 5. Создать администратора

```bash
uv run python seed.py
```

### 6. Запустить сервер

```bash
./scripts/run.sh
```

### API-документация

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Архитектура

### Паттерн организации кода

Каждый модуль следует трёхслойной архитектуре:

```
app/
└── module_name/
    ├── model.py        # SQLAlchemy модель
    ├── schemas.py      # Pydantic схемы (input/output разделены)
    ├── repository.py   # Работа с БД, только SQL-запросы
    ├── service.py      # Бизнес-логика
    ├── router.py       # HTTP-эндпоинты, валидация прав
    └── enums.py        # Перечисления
```

### Ключевые архитектурные принципы

**База данных как основа логики.** Вся плановая и вычислительная логика (генерация задач, расчёт дедлайнов, замена ответственных на время отпуска) живёт в PostgreSQL-функциях и запускается через `pg_cron`. Это гарантирует выполнение независимо от состояния backend-процесса. Celery и APScheduler намеренно не используются.

**Единый паттерн доступа.** Чтение — любому авторизованному пользователю. Запись (`create`/`update`/`delete`) — только администратору. Исключения (задачи, инциденты) описаны в соответствующих разделах.

**Real-time уведомления.** WebSocket + `pg_notify` вместо polling. Фоновый listener запускается через `asyncio.create_task()` в `lifespan` и живёт весь цикл приложения.

---

## Схема базы данных

Все таблицы находятся в схеме `kcell_web`.

### Таблица `user`

Изменения по сравнению с AS IS: добавлены `first_name`, `last_name`, `email`, `is_og`, `created_at`, `updated_at`.

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | INTEGER | PK | Первичный ключ |
| `username` | VARCHAR(64) | NOT NULL, UNIQUE | Логин пользователя |
| `first_name` | VARCHAR(64) | NULL | Имя |
| `last_name` | VARCHAR(64) | NULL | Фамилия |
| `email` | VARCHAR(64) | NOT NULL, UNIQUE | Email |
| `hashed_password` | VARCHAR(256) | NOT NULL | Хэш пароля (Argon2) |
| `role` | ENUM(ADMIN, USER) | NOT NULL | Роль |
| `is_og` | BOOLEAN | NOT NULL, DEFAULT false | Принадлежность к ОГ |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL, server_default | Дата обновления |

**AS IS → TO BE:**

| Поле | AS IS | TO BE |
|---|---|---|
| `first_name` | отсутствовало | VARCHAR(64) |
| `last_name` | отсутствовало | VARCHAR(64) |
| `email` | отсутствовало | VARCHAR(64) UNIQUE |
| `is_og` | отсутствовало | BOOLEAN NOT NULL DEFAULT false |
| `created_at` | отсутствовало | TIMESTAMPTZ (TimeStampMixin) |
| `updated_at` | отсутствовало | TIMESTAMPTZ (TimeStampMixin) |

---

### Таблица `control`

Изменения: `frequency` стал Enum, добавлены `status`, `dashboard_url`, `created_at`, `updated_at`, индексы на FK-поля.

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | INTEGER | PK | Первичный ключ |
| `area` | VARCHAR(64) | NOT NULL | Направление |
| `name` | VARCHAR(128) | NOT NULL | Название контрола |
| `description` | VARCHAR | NULL | Описание |
| `time_estimate` | INTEGER | NOT NULL | Оценка времени (мин) |
| `frequency` | ENUM | NOT NULL | Периодичность |
| `responsible_id` | INTEGER | FK → user, INDEX | Ответственный (текущий) |
| `backup_id` | INTEGER | FK → user, INDEX | Резервный ответственный |
| `original_user_id` | INTEGER | FK → user, INDEX | Исходный ответственный |
| `risk` | VARCHAR(64) | DEFAULT '0' | Риск (placeholder) |
| `priority` | VARCHAR(32) | DEFAULT '0' | Приоритет (placeholder) |
| `dashboard_url` | VARCHAR(512) | NULL | Ссылка на дашборд |
| `status` | ENUM(ACTIVE, INACTIVE) | NOT NULL | Статус контрола |
| `created_at` | TIMESTAMPTZ | NOT NULL | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Дата обновления |

**Enum `frequency`:** `ежедневно`, `еженедельно`, `ежемесячно`, `ежеквартально`, `по запросу`

**AS IS → TO BE:**

| Поле | AS IS | TO BE |
|---|---|---|
| `frequency` | STRING(32), произвольный текст | ENUM с фиксированными значениями |
| `status` | отсутствовало | ENUM(ACTIVE, INACTIVE) |
| `dashboard_url` | отсутствовало | VARCHAR(512) NULL |
| Индексы | отсутствовали | INDEX на `responsible_id`, `backup_id`, `original_user_id` |

---

### Таблица `task`

Изменения: `date` заменён на `deadline_time` с таймзоной, `status` стал Enum, добавлены `created_at`/`updated_at`.

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | INTEGER | PK | Первичный ключ |
| `control_id` | INTEGER | FK → control, NOT NULL, INDEX | Связанный контрол |
| `user_id` | INTEGER | FK → user, NULL | Исполнитель |
| `start_time` | TIMESTAMPTZ | NULL | Время начала |
| `end_time` | TIMESTAMPTZ | NULL | Время завершения |
| `comments` | TEXT | NULL | Комментарии |
| `status` | ENUM | NOT NULL, DEFAULT NOT_STARTED | Статус задачи |
| `weekend_group_id` | INTEGER | FK → task (self-ref), NULL | Группа для выходных задач |
| `deadline_time` | TIMESTAMPTZ | NULL | Дедлайн (по частоте контрола) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Дата обновления |

**Enum `TaskStatus`:** `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

**Расчёт `deadline_time` по частоте:**

| Частота | Дедлайн |
|---|---|
| Ежедневно | 23:59:59 текущего дня |
| Еженедельно | Воскресенье текущей недели |
| Ежемесячно | Последний день месяца |
| Ежеквартально | Последний день квартала |
| По запросу | +100 лет (бессрочно) |

**AS IS → TO BE:**

| Поле | AS IS | TO BE |
|---|---|---|
| `date` | Date (сырая дата периода) | `deadline_time` TIMESTAMPTZ (расчёт по частоте контрола) |
| `status` | STRING(32), произвольный текст | ENUM TaskStatus |
| `created_at` | DateTime (без таймзоны) | TIMESTAMPTZ (TimeStampMixin) |

---

### Таблица `vacation_schedule`

Изменения: `vacation_type` и `status` стали Enum, добавлен TimeStampMixin.

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | INTEGER | PK | Первичный ключ |
| `user_id` | INTEGER | FK → user, NOT NULL | Пользователь |
| `start_date` | DATE | NOT NULL | Начало отпуска |
| `end_date` | DATE | NOT NULL | Конец отпуска |
| `vacation_type` | ENUM | NOT NULL | Тип отпуска |
| `status` | ENUM | NOT NULL | Статус |
| `created_at` | TIMESTAMPTZ | NOT NULL | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Дата обновления |

**Enum `VacationType`:** `annual_leave`, `sick_leave`, `business_trip`

**Enum `VacationStatus`:** `active`, `cancelled`

**AS IS → TO BE:**

| Поле | AS IS | TO BE |
|---|---|---|
| `vacation_type` | STRING произвольный | ENUM VacationType |
| `status` | STRING произвольный | ENUM VacationStatus |
| `created_at` / `updated_at` | ручные поля | TimeStampMixin |

---

### Таблица `incident`

В legacy таблица существовала в другом виде; в новом проекте реализована с нуля.

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | INTEGER | PK | Первичный ключ |
| `task_id` | INTEGER | FK → task, NULL | Связанная задача |
| `username` | VARCHAR | NOT NULL | Автор (имя из токена) |
| `status` | ENUM | NOT NULL | Статус (FSM) |
| `control_type` | VARCHAR(255) | NOT NULL | Тип контрола |
| `control_subtype` | VARCHAR(255) | NOT NULL | Подтип контрола |
| `detected_source` | VARCHAR(255) | NOT NULL | Источник обнаружения |
| `reporting_month` | DATE | NOT NULL | Отчётный месяц |
| `occurrence_date` | DATE | NOT NULL | Дата возникновения |
| `case_type` | VARCHAR(50) | NOT NULL | Тип кейса |
| `incident_name` | VARCHAR(255) | NOT NULL | Название инцидента |
| `description` | TEXT(4000) | NOT NULL | Описание |
| `estimated_loss` | NUMERIC(15,2) | NULL | Расчётные потери |
| `opportunity_loss` | NUMERIC(15,2) | NULL | Упущенная выгода |
| `bad_debt` | NUMERIC(15,2) | NULL | Безнадёжный долг |
| `prevented_savings` | NUMERIC(15,2) | NULL | Предотвращённые потери |
| `recovered_savings` | NUMERIC(15,2) | NULL | Возврат средств |
| `kpi_calculation` | NUMERIC(15,2) | NULL | Расчёт KPI |
| `attachment` | VARCHAR | NULL | Прикреплённый файл |
| `created_at` | TIMESTAMPTZ | NOT NULL | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Дата обновления |

**Enum `IncidentStatus` (FSM):**

```
Открыт → На согласовании → Согласован
                         → Отклонён
```

**AS IS → TO BE:**

| Поле | AS IS | TO BE |
|---|---|---|
| `status` | STRING произвольный | ENUM IncidentStatus (FSM) |
| `created_date` | DateTime произвольный | `created_at` / `updated_at` (TimeStampMixin) |

---

### Таблица `mfs_audit_log`

Иммутабельная таблица — нет `update`/`delete`. Записи создаются только как side-effect операции `/mfs/action`.

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | INTEGER | PK | Первичный ключ |
| `user_id` | INTEGER | FK → user, NOT NULL | Инициатор операции |
| `username` | VARCHAR(64) | NOT NULL | Имя инициатора |
| `action` | ENUM | NOT NULL | Тип операции |
| `msisdns_text` | TEXT | NOT NULL | Список номеров |
| `results_json` | JSONB | NULL | Результаты операций |
| `summary_ok` | INTEGER | DEFAULT 0 | Успешных операций |
| `summary_skipped` | INTEGER | DEFAULT 0 | Пропущенных |
| `summary_error` | INTEGER | DEFAULT 0 | Ошибок |
| `created_at` | TIMESTAMPTZ | NOT NULL, server_default | Дата создания |

**Enum `Action`:** `block`, `unblock`, `check`

**AS IS → TO BE:**

| Поле | AS IS | TO BE |
|---|---|---|
| `action` | STRING(16) | ENUM Action |
| `results_json` | TEXT + json.dumps/loads | JSONB |
| `created_at` | naive DateTime (UTC вручную) | TIMESTAMPTZ server_default |
| Поиск дубликата в block | `LIKE '%...'` (full scan) | точное `=` |
| Подключение к blacklist БД | psycopg2 sync | asyncpg async |

---

### Таблица `notification`

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | INTEGER | PK | Первичный ключ |
| `notification_type` | ENUM | NOT NULL | Тип уведомления |
| `recipients_email` | VARCHAR(4000) | NOT NULL | Email получателей (через `;`) |
| `sender` | VARCHAR(255) | NOT NULL | Отправитель |
| `title` | VARCHAR(500) | NULL | Заголовок |
| `html_content` | TEXT | NOT NULL | HTML-контент |
| `error_message` | TEXT | NULL | Сообщение об ошибке |
| `responsible_user_id` | INTEGER | FK → user, NULL | Ответственный пользователь |
| `created_at` | TIMESTAMPTZ | NOT NULL | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Дата обновления |

**Enum `NotificationTypes`:** `TASK_CREATED`, `TASK_UPDATED`, `INCIDENT_UPDATED`

---

### Таблица `notification_recipient`

Junction-таблица: один `is_read` на каждого получателя независимо.

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | INTEGER | PK | Первичный ключ |
| `notification_id` | INTEGER | FK → notification, NOT NULL, CASCADE DELETE | Уведомление |
| `recipient_id` | INTEGER | FK → user, NOT NULL, CASCADE DELETE | Получатель |
| `is_read` | BOOLEAN | NOT NULL | Прочитано |
| `read_at` | TIMESTAMPTZ | NULL | Время прочтения |

Уникальный constraint: `(notification_id, recipient_id)` — используется в `ON CONFLICT DO NOTHING`.

---

### Таблица `non_working_days`

Новая таблица. В legacy нерабочие дни вычислялись ad hoc в коде при каждом обращении.

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK | Первичный ключ |
| `date` | DATE | Дата нерабочего дня |
| `description` | VARCHAR | Описание (праздник / выходной) |

Заполняется скриптом `refresh_non_working_days.py` через библиотеку `holidays` (календарь Казахстана с переносами). Используется SQL-функциями генерации задач напрямую через JOIN без обращения к Python.

---

## API Reference

Базовый URL: `http://localhost:8000/api/v1`

Все защищённые эндпоинты требуют заголовка:
```
Authorization: Bearer <access_token>
```

---

### Auth

**Prefix:** `/api/v1/auth`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| POST | `/login` | Публичный | Вход, возвращает `access_token` + `refresh_token` |
| POST | `/refresh` | Публичный | Обновление `access_token` по `refresh_token` |
| GET | `/me` | Авторизованный | Данные текущего пользователя |

**Примечание:** `refresh_token` имеет срок жизни 100 лет — намеренный компромисс для внутреннего корпоративного инструмента без UX-требований к повторному входу. Механизм инвалидации через Redis-blacklist отложен.

---

### User

**Prefix:** `/api/v1/user`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/` | Авторизованный | Список пользователей (пагинация: `page`, `limit=20`) |
| GET | `/{user_id}` | Авторизованный | Пользователь по ID |
| GET | `/by_username/{username}` | Авторизованный | Пользователь по username |
| POST | `/` | Только Admin | Создание пользователя |
| PATCH | `/{user_id}` | Admin или сам пользователь | Обновление данных |
| PATCH | `/{user_id}/password` | Admin или сам пользователь | Смена пароля |
| DELETE | `/{user_id}` | Только Admin | Удаление пользователя |

**Требования к паролю:** минимум 8 символов, заглавные и строчные буквы, цифра, спецсимвол (`@$!_%*?&`).

---

### Control

**Prefix:** `/api/v1/controls`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/` | Авторизованный | Список контролов с фильтрацией и сортировкой |
| GET | `/{control_id}` | Авторизованный | Контрол по ID |
| POST | `/` | Только Admin | Создание контрола |
| PATCH | `/{control_id}` | Только Admin | Обновление контрола |
| DELETE | `/{control_id}` | Только Admin | Удаление контрола |

**Query-параметры для GET `/`:**

| Параметр | Тип | Описание |
|---|---|---|
| `area` | string | Фильтр по направлению |
| `control_status` | enum | Фильтр по статусу |
| `order_by` | string | Поле сортировки (default: `created_at`) |
| `order_type` | `asc`/`desc` | Направление сортировки (default: `desc`) |
| `page` | int | Страница (default: 1) |
| `per_page` | int | Записей на странице (default: 20) |

---

### Task

**Prefix:** `/api/v1/tasks`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/` | Авторизованный | Все задачи (Admin — все, User — свои) |
| GET | `/tasks-with-controls` | Авторизованный | Задачи с данными контролов |
| GET | `/not-started` | Авторизованный | Задачи со статусом NOT_STARTED |
| GET | `/in-progress` | Авторизованный | Задачи IN_PROGRESS текущего пользователя |
| GET | `/completed` | Авторизованный | Завершённые задачи |
| GET | `/overdue` | Авторизованный | Просроченные задачи |
| GET | `/{task_id}` | Авторизованный | Задача по ID |
| POST | `/` | Авторизованный | Создание задачи вручную |
| PATCH | `/{task_id}` | Admin / Responsible / Backup / ОГ | Обновление задачи |
| POST | `/{task_id}/start` | Авторизованный | Взять задачу в работу |
| POST | `/{task_id}/complete` | Авторизованный | Завершить задачу |
| DELETE | `/{task_id}` | Только Admin | Удаление задачи |
| POST | `/trigger-tasks-generator` | Только Admin | Ручной запуск генерации задач |

**Матрица прав на PATCH:**

| Роль | Может изменять? |
|---|---|
| Admin | Да, любую |
| Ответственный (`responsible_id`) | Да, свою |
| Резервный (`backup_id`) | Да, свою |
| Член ОГ + задача ОГ-пользователя | Да |
| Остальные | Нет (403) |

**Поведение `complete`:** если контрол задачи имеет частоту `по запросу` — автоматически создаётся новая задача. Если задача завершается в понедельник и имеет `weekend_group_id` — связанные субботние/воскресные задачи также получают статус `COMPLETED`.

---

### Vacation Schedule

**Prefix:** `/api/v1/vacation-schedule`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/` | Авторизованный | Список записей об отпусках |
| GET | `/vacation-remaining-days` | Только Admin | Активные отпуска с остатком дней |
| POST | `/` | Только Admin | Создание записи об отпуске |
| PATCH | `/{vacation_id}` | Только Admin | Обновление записи |
| DELETE | `/{vacation_id}` | Только Admin | Удаление записи |

---

### Incident

**Prefix:** `/api/v1/incidents`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/` | Авторизованный | Список инцидентов (пагинация) |
| GET | `/{incident_id}` | Авторизованный | Инцидент по ID |
| POST | `/` | Авторизованный | Создание инцидента (только для завершённой задачи) |
| PATCH | `/{incident_id}` | Admin или автор (только статус `Открыт`) | Обновление инцидента |
| PATCH | `/{incident_id}/status` | Admin (любой) / Автор (только Открыт→На согласовании) | Изменение статуса |
| DELETE | `/{incident_id}` | Только Admin | Удаление инцидента |

**Правила FSM для статуса:**

| Переход | Кто может |
|---|---|
| Открыт → На согласовании | Автор или Admin |
| На согласовании → Согласован | Только Admin |
| На согласовании → Отклонён | Только Admin |
| Согласован / Отклонён → любой | Невозможно |

---

### MFS Audit Log

**Prefix:** `/api/v1/mfs`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/` | Авторизованный | Список логов (Admin — все, User — свои) |
| GET | `/{mfs_id}` | Admin или владелец записи | Лог по ID |
| POST | `/action` | Авторизованный | Выполнить операцию (block/unblock/check) + записать в журнал |

**Особенности:**
- Таблица `mfs_audit_log` иммутабельна: нет эндпоинтов для изменения и удаления записей.
- Сбой записи в журнал не блокирует саму операцию — пользователь получает `audit_warning` в ответе.
- Операции выполняются над отдельной blacklist-БД через второй `AsyncEngine` (asyncpg).

---

### Notification

**Prefix:** `/api/v1/notifications`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `` | Авторизованный | Уведомления текущего пользователя (пагинация) |
| GET | `/unread-count` | Авторизованный | Количество непрочитанных |
| GET | `/{notification_id}/html` | Авторизованный | HTML-контент уведомления |
| POST | `/{notification_id}/read` | Авторизованный | Пометить как прочитанное |
| POST | `/` | Авторизованный | Создать уведомление |
| PATCH | `/{notification_id}/become_responsible_user` | Авторизованный | Стать ответственным |
| WS | `/ws?token=...` | По JWT | WebSocket-соединение |

**WebSocket:** JWT передаётся query-параметром `?token=`, так как браузерный WebSocket API не поддерживает кастомные заголовки.

**Архитектура доставки:**
- При `INSERT` в таблицу `notification` PostgreSQL-триггер `on_new_notification` вызывает `pg_notify('new_notification', ...)`.
- Фоновый `pg_notify_listener` (asyncpg) ловит событие и пушит онлайн-пользователям через WebSocket.
- Оффлайн-пользователи не теряют уведомления: записи в `notification_recipient` создаются всегда.
- При загрузке страницы фронт получает актуальный счётчик через HTTP `/unread-count`.

---

## Фоновые задачи и функции БД

Весь планировщик вынесен в PostgreSQL (`pg_cron`). Ни Celery, ни APScheduler не используются.

| Функция | Триггер | Описание |
|---|---|---|
| `generate_daily_tasks()` | pg_cron, ежедневно | Генерация ежедневных задач |
| `generate_weekly_tasks()` | pg_cron, ежедневно | Генерация еженедельных задач |
| `generate_monthly_tasks()` | pg_cron, 1-е число | Генерация ежемесячных задач |
| `generate_quarterly_tasks()` | pg_cron, 1-е число квартала | Генерация ежеквартальных задач |
| `update_overdue_task_dates()` | pg_cron, ежедневно | Обновление дедлайнов просроченных задач |
| `reassign_tasks_for_vacation()` | pg_cron, ежедневно | Замена/возврат ответственного на время отпуска |
| `on_new_notification` (trigger) | INSERT в notification | pg_notify для real-time доставки |

Ручной запуск генерации задач доступен через `POST /api/v1/tasks/trigger-tasks-generator` (только Admin).

Обновление нерабочих дней — через скрипт `./scripts/refresh_non_working_days.sh`.

---

## Скрипты

| Команда | Описание |
|---|---|
| `./scripts/run.sh` | Запуск сервера |
| `./scripts/migrate.sh "название"` | Создать и применить миграцию |
| `./scripts/rollback.sh` | Откатить последнюю миграцию |
| `./scripts/lint.sh` | Проверка и форматирование кода (ruff + mypy) |
| `./scripts/seed.sh` | Заполнить БД начальными данными (admin-пользователь) |
| `./scripts/refresh_non_working_days.sh` | Обновить таблицу нерабочих дней |

---

## Изменения относительно legacy

### Глобальные

- Все `PUT` заменены на `PATCH` во всём проекте.
- Flask + sync SQLAlchemy → FastAPI + SQLAlchemy 2.0 async.
- Рантайм-создание таблиц (`_ensure_table`) → только через Alembic.
- Произвольные строки для статусов и типов → `enum.Enum` (не `StrEnum` — вызывает проблемы с миграциями).
- Celery и APScheduler → `pg_cron` + PostgreSQL-функции.

### По модулям

| Модуль | Ключевые изменения |
|---|---|
| Auth | Добавлен `refresh_token`, в legacy был только `access_token` |
| User | Новые поля `is_og`, `email`, `first_name`, `last_name`, `created_at`, `updated_at` |
| Control | `frequency`: string → Enum; добавлены `status`, `dashboard_url`; индексы на FK |
| Task | `date` → `deadline_time` TIMESTAMPTZ; `status`: string → Enum; генерация задач перенесена в БД |
| Vacation | `vacation_type`/`status`: string → Enum; reassign/restore логика перенесена в SQL-функцию |
| Incident | Модуль реализован с нуля; `status` реализован как FSM |
| MFS | `results_json`: TEXT → JSONB; `action`: string → Enum; sync → async подключение к blacklist БД |
| Notification | Новый модуль; real-time через WebSocket + pg_notify вместо polling |
| non_working_days | Новая таблица; в legacy нерабочие дни вычислялись ad hoc в Python |