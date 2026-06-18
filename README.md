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



# Изменении
Все put заменил на patch

## Auth
 - Для авторизации добавил refresh token. Срок хранение токена 100 лет. 

## User 
 - Добавил к user модельке три новых аттрибутов: is_og(для того чтобы отмечать членов ОГ), created_at and updated_at
 - Добавил пагинацию на get_all_users() с limit по дефолту 20 users
 - Юзера может создавать только админ 
 - Юзера может изменять админ либо сам юзер. В том числе и пароль
 - Юзера может удалять только админ
 - Расчет и заполнение колонки weekend_group_id перенесено в функции бд
 - Расчет дедлайна каждой задачи написано в функции бд и для ручного запуска написан в бэкенд

## Control
 - Frequency полноценно изменил на enum 
 - risk and priority оставил как простые пустышки с дефолтными значением 0
 - для get_all_controls добавил фильтрацию и сортировку. Фильтрация идет по двум полям: Area and control_status
 - у всех эндпойнтов связанных с контроллерами стоит базовая защита. Как минимум для получение инфо юзер должен быть регистрированным. 
 - для post, patch, delete добавил проверку admin.

## Holidays
 - Создал новую таблицу non_working_days где хранятся праздничные дни и суббота-воскресенье