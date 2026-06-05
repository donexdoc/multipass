# Multipass

Сервис управления IP-адресами для split-routing. Загружает адреса из внешних источников по расписанию, позволяет добавлять свои, генерирует готовые конфиги для MikroTik и других потребителей.

## Stack

- **Backend:** NestJS 11 + Prisma 7 + PostgreSQL 16
- **Frontend:** React 19 + Vite + shadcn/ui
- **Monorepo:** pnpm workspaces + Turborepo

## Запуск для разработки

```bash
# 1. Зависимости
pnpm install

# 2. Переменные окружения
cp .env.example .env   # DATABASE_URL и прочее уже совпадают с docker-compose.yml

# 3. PostgreSQL (кредентиалы из docker-compose.yml — менять не нужно)
docker compose up db -d

# 4. Миграции
cd packages/prisma && pnpm prisma migrate dev

# 5. Приложения (в отдельных терминалах)
cd apps/be-multipass && pnpm dev   # http://localhost:4000
cd apps/fe-multipass && pnpm dev   # http://localhost:5173
```

## Тесты

```bash
cd apps/be-multipass && pnpm test
```

## Переменные окружения

| Переменная           | Описание                      |
| -------------------- | ----------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string  |
| `JWT_SECRET`         | Секрет для access-токенов     |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов    |
| `ADMIN_LOGIN`        | Логин первого администратора  |
| `ADMIN_PASSWORD`     | Пароль первого администратора |
| `CORS_ORIGIN`        | Разрешённый origin для CORS   |
