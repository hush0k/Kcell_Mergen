# Kcell Web Backend

FastAPI бэкенд для внутренней системы управления контролями и задачами Kcell.

## Стек

- Python 3.14
- FastAPI
- SQLAlchemy 2.0 (async)
- PostgreSQL
- Alembic
- Pydantic v2
- JWT (python-jose)
- Argon2 (passlib)

## Установка

### 1. Клонируй репозиторий

git clone <https://github.com/hush0k/kcell_backend.git>
cd backend

### 2. Установи зависимости

uv sync

### 3. Создай .env файл

Скопируй `.example.env` и заполни:

cp .example.env .env

### 4. Примени миграции

./scripts/migrate.sh "init"

### 5. Создай админа

uv run python seed.py

### 6. Запусти сервер

./scripts/run.sh

## API

После запуска документация доступна по адресу:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Скрипты

| Команда | Описание |
|---|---|
| `./scripts/run.sh` | Запуск сервера |
| `./scripts/migrate.sh "название"` | Создать и применить миграцию |
| `./scripts/rollback.sh` | Откатить последнюю миграцию |
| `./scripts/lint.sh` | Проверка и форматирование кода |
| `./scripts/seed.sh` | Заполнить БД начальными данными |

