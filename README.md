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

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Секрет для access-токенов |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов |
| `ADMIN_LOGIN` | Логин первого администратора |
| `ADMIN_PASSWORD` | Пароль первого администратора |
| `CORS_ORIGIN` | Разрешённый origin для CORS |

---

## BGP-интеграция (GoBGP)

Сервис анонсирует заблокированные адреса по BGP через GoBGP.
MikroTik получает маршруты и направляет трафик через VPN-машину,
без ручного обновления списков маршрутов.

### Схема работы

```
MikroTik ←── BGP (TCP 179) ──→ GoBGP ←── gRPC (50051) ──→ NestJS (multipass)
         получает маршруты      анонсирует                   управляет списком
                                «для этих IP иди             адресов
                                 на VPN-машину»
         ──── трафик к заблокированным IP ────→ VPN-машина (AmneziaWG и т.п.)
```

Трафик через multipass VM **не проходит** — она только анонсирует маршруты.
MikroTik сам направляет трафик на VPN-машину по полученному next-hop.

### Настройка GoBGP

GoBGP запускается в Docker с `network_mode: host` — это нужно, чтобы MikroTik мог достучаться до порта 179 (BGP).
NestJS подключается к GoBGP по gRPC на порту 50051 через `host.docker.internal`.

**1. Соберите образ GoBGP** (один раз, нужны исходники репозитория):

```bash
docker build -f Dockerfile.gobgp -t multipass-gobgp:latest .
```

> Если используете CI/CD: пайплайн соберёт и запишет в реестр — укажите `IMAGE_GOBGP=<registry-path>` в `.env`.

**2. Добавьте в `.env` на сервере:**

```bash
GOBGP_ROUTER_ID=192.168.1.10   # IP этой VM в LAN (BGP router-id)
GOBGP_LOCAL_AS=65000           # локальный AS
GOBGP_PEER_IP=192.168.1.1      # IP MikroTik (BGP peer)
GOBGP_PEER_AS=65001            # AS MikroTik
```

**3. Запустите GoBGP** (один раз; `restart: unless-stopped` держит контейнер дальше):

```bash
docker compose -f docker-compose.prod.yml --profile bgp up -d gobgp
```

**4. Настройка в UI multipass:**

В разделе **Настройки** выставьте:
| Ключ | Значение |
|---|---|
| `BGP_ENABLED` | `true` |
| `BGP_NEXT_HOP` | LAN IP вашей VPN-машины (например `192.168.1.20`) — именно туда MikroTik будет слать трафик к заблокированным адресам |
| `BGP_GOBGP_API_URL` | `host.docker.internal:50051` — gRPC-адрес GoBGP (значение по умолчанию) |

### Настройка MikroTik (RouterOS 7.x)

Подключитесь через Winbox или SSH:

**1. BGP-пир:**
```routeros
/routing bgp connection add \
  name=multipass \
  as=65001 \
  remote.address=192.168.1.10 \
  remote.as=65000 \
  router-id=192.168.1.1 \
  address-families=ip \
  connect=yes
```
> `192.168.1.10` — IP multipass VM, `192.168.1.1` — IP MikroTik, `65001`/`65000` — AS-номера.

**2. Маршрутизация анонсированных префиксов через VPN-машину:**

BGP-маршруты содержат next-hop = IP VPN-машины (задан в `BGP_NEXT_HOP`).
MikroTik автоматически направит на неё трафик для анонсированных префиксов.

Если нужно явно задать таблицу маршрутизации:
```routeros
/routing table add name=vpn-bypass fib=no

/ip route add \
  dst-address=0.0.0.0/0 \
  gateway=192.168.1.20 \
  routing-table=vpn-bypass

/routing filter rule add \
  chain=bgp-in \
  rule="set routing-table vpn-bypass; accept"
```

> `192.168.1.20` — LAN IP вашей VPN-машины (то, что задано в `BGP_NEXT_HOP`).
> Конкретная конфигурация зависит от топологии вашей сети.

**3. Проверка:**
```routeros
/routing bgp session print
/ip route print where received-from=multipass
```

### Статус и диагностика

- Dashboard → карточка BGP: статус включения + статус соединения с GoBGP
- Страница `/bgp`: детальный статус + ручная синхронизация
- Логи NestJS: сообщения `BGP full sync done`, `BGP sync error`
