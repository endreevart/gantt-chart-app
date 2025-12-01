# Настройка PostgreSQL

## Установка PostgreSQL

### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Скачайте и установите с официального сайта: https://www.postgresql.org/download/windows/

## Создание базы данных

```bash
# Войдите в PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE gantt_db;

# Создайте пользователя (опционально)
CREATE USER gantt_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE gantt_db TO gantt_user;
```

## Настройка переменных окружения

Создайте файл `.env` в папке `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gantt_db
```

Или для пользователя:
```env
DATABASE_URL=postgresql://gantt_user:your_password@localhost:5432/gantt_db
```

## Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

## Инициализация базы данных

Таблицы создадутся автоматически при первом запуске сервера.

Или вручную:
```bash
python3 -c "from database import init_db; init_db()"
```

## Запуск сервера

```bash
python3 main.py
```

