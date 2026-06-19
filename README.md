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

## Vacation
    - put заменил на patch, всё CRUD переписал на async сервис
    - vacation_type и status вынес в enum (VacationType: annual_leave/sick_leave/business_trip, VacationStatus: active/cancelled). В легаси были строки
     - created_at/updated_at теперь из TimeStampMixin
    - create, update, delete доступны только админу
    - Добавил get_active_vacations_with_remaining_days() — отдает активные отпуска и их количество
    - Логику замены ответственного на время отпуска перенес в функцию бд reassign_tasks_for_vacation(): если у original_user активный отпуск на текущую дату — control.responsible_id ставится на backup_id, после отпуска возвращается обратно на original_user_id
    - Внутренний хелпер _check_for_vacation(user_id) для проверки активного отпуска через func.current_date()

## Task
    - put заменил на patch
    - Легаси поле date (период) заменил на deadline_time (DateTime с tz). Дедлайн считается от частоты контрола: daily → 23:59:59 того же дня, weekly → воскресенье, monthly → последний день месяца, quarterly → последний день квартала, по запросу → 100 лет (бесконечная задача)
    - status вынес в enum TaskStatus (not_started/in_progress/completed/cancelled)
    - Генерацию задач перенес в функции бд (generate_daily/weekly/monthly/quarterly_tasks, update_overdue_task_dates). Для ручного запуска эндпоинт POST /trigger-tasks-generator (только админ)
    - Реализовал complete_task: ставит completed +end_time, при контроле «по запросу» автоматически создает новуюзадачу
    - weekend_group_id: при завершении задачи (понедельник) sync_weekend_tasks автоматически проставляет статус связанным субботним/воскресным задачам
    - start_task: берет задачу в работу (in_progress + start_time + назначение юзера)
    - get_all с ролевой фильтрацией: админ видит все, обычный юзер — свои
    - get_overdue тоже по роли: админ все просроченные, юзер свои
    - Отдельные эндпоинты по статусам: /not-started, /in-progress, /completed, /overdue
    - В PATCH /tasks/{id} добавил проверку прав: изменять может админ, ответственный (responsible_id), бэкап (backup_id) либо член ОГ если задача ОГ-шная
    - get_all_with_controls — задачи вместе с контролами, с пагинацией
    - delete только админ

## Incident
    - Создал новую таблицу incident (в легаси модель была, в новом проекте отсутствовала)
    - status вынес в enum IncidentStatus (Открыт/На согласовании/Согласован/Отклонён)
    - created_date убрал — заменил на created_at/updated_at из TimeStampMixin
    - Денежные поля (estimated_loss, opportunity_loss, bad_debt и т.д.) оставил Numeric(15,2) → Decimal
    - Связь с task через task_id (nullable), relationship task ↔ incidents
