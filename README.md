# MDC Player Statistics

Веб-приложение на Next.js для статистики MDC-клана: дашборды, лидерборды, прогресс игроков, сборка сквадов, синхронизация из API с локальным кэшем.

## Что умеет

- Работает только с API `https://api.hungryfishteam.org/gas/mdc` (локальный JSON больше не используется).
- Показывает дашборды по событиям, ролям, картам, активности, лучшим матчам и игрокам.
- Поддерживает прогресс синхронизации, сводку последней загрузки и ретроспективу новых событий за 7 дней.
- Сборка сквадов:
  - размер сквада `1..9`
  - количество сквадов `1..9`
  - импорт игроков из текстового анонса (блок `:accepted:`)
  - ручной мультивыбор игроков
  - авто/баланс-раскладка по ролям и статам
  - ручная коррекция слотов после генерации
- Авто-смена сезонной/праздничной темы по календарю РФ.
- Полностью браузерная модель данных (без серверных API route-ов проекта).

## Требования

- Docker Engine 24+ и Docker Compose v2
- Опционально для запуска без Docker: Node.js 22+, pnpm 10+

## Быстрый старт (Docker, production)

```bash
docker compose up --build -d
```

Приложение: `http://localhost:3001`  
Порт по умолчанию: `${APP_PORT:-3001}`.

Логи:

```bash
docker compose logs -f app
```

Остановка:

```bash
docker compose down
```

## Режим разработки (Docker + Hot Reload)

```bash
docker compose --profile dev up app-dev
```

Приложение: `http://localhost:3002` (или `${APP_DEV_PORT}`).

В этом режиме используется `next dev`, изменения кода применяются без пересборки контейнера.

## Локальный запуск без Docker

```bash
corepack enable
pnpm install --no-frozen-lockfile
pnpm dev
```

Приложение: `http://localhost:3000`.

## GitHub Pages

Репозиторий уже готов к деплою на GitHub Pages через workflow:

- `.github/workflows/deploy-pages.yml`

Что нужно сделать в репозитории GitHub:

1. `Settings -> Pages -> Build and deployment -> Source: GitHub Actions`
2. Запушить в `main` (или запустить `Deploy GitHub Pages` вручную из Actions)

Workflow сам выставляет:

- `STATIC_EXPORT=true`
- `NEXT_PUBLIC_BASE_PATH=/<repo-name>`

и публикует содержимое `out/`.

## Источник данных и синхронизация

Фронтенд ходит напрямую в публичный API:

- `https://api.hungryfishteam.org/gas/mdc/all`
- `https://api.hungryfishteam.org/gas/mdc/pages`
- `https://api.hungryfishteam.org/gas/mdc/events`
- `https://api.hungryfishteam.org/gas/mdc/players`
- `https://api.hungryfishteam.org/gas/mdc/playersevents?page=N`
- `https://api.hungryfishteam.org/gas/mdc/clans`
- `https://api.hungryfishteam.org/gas/mdc/dictionaries`
- `https://api.hungryfishteam.org/gas/mdc/player?playerNickname=<nickname>`

### Важное поведение кэша

- Кэш хранится в `localStorage` (`mdc-api-cache-v5`).
- При обычном обновлении страницы, если кэш уже есть, приложение использует его и не запускает сетевую синхронизацию автоматически.
- Синхронизация запускается:
  - при первом старте без кэша,
  - кнопкой `Сбросить кэш и обновить (Shift+R)`.
- Ручная синхронизация очищает локальный кэш и запускает полную повторную синхронизацию.
- При ручной синхронизации используется `publish=true` (мимо кэша upstream API).
- Для `playersevents` используется постраничная загрузка (`pages` + `playersevents?page=N`), `null`-записи фильтруются.
- Объединение данных накопительное: при обновлениях более полные срезы не теряются.

## Retry / Backoff API

В `lib/api.ts` реализован retry с экспоненциальным backoff для timeout/network/`429`/`5xx`.

Поддерживаемые env:

- `NEXT_PUBLIC_MDC_API_BASE` (по умолчанию `https://api.hungryfishteam.org/gas/mdc`)
- `NEXT_PUBLIC_MDC_API_TIMEOUT_MS` (по умолчанию `30000`)
- `NEXT_PUBLIC_MDC_API_RETRY_ATTEMPTS` (по умолчанию `2`)
- `NEXT_PUBLIC_MDC_API_BACKOFF_BASE_MS` (по умолчанию `500`)
- `NEXT_PUBLIC_MDC_API_BACKOFF_MAX_MS` (по умолчанию `5000`)
- `NEXT_PUBLIC_STEAM_PROFILE_PROXY_BASE` (по умолчанию `https://api.codetabs.com/v1/proxy/?quest=`)
- `NEXT_PUBLIC_BASE_PATH` (нужно для Pages, например `/<repo-name>`)
- `STATIC_EXPORT=true` (включает `output: export`)

## Аватарки Steam

Аватарки резолвятся в браузере:

- запрашивается `steamcommunity.com/profiles/<steamId>?xml=1` через публичный CORS proxy,
- URL аватарки извлекается из `<avatarFull>` и кешируется в памяти клиента,
- при ошибке/некорректном `steamId` показывается placeholder.

## Сборка сквадов

- Дефолтный шаблон ролей: `SL`, `Медик`, `Стрелок`.
- Ручной выбор кандидатов на слот сортируется по:
  1. `K/D` на выбранной роли,
  2. общий `K/D` (второй ключ).
- Если есть кандидаты с историей по роли, они приоритетнее игроков без истории этой роли.
- Есть режим `Сбалансировать из доступных`, который пытается выровнять команды и допускает адаптацию размерности под фактическое число игроков.

## Сезонная тема

Тема автоматически переключается по московскому времени (`Europe/Moscow`):

- праздники РФ (23 февраля, 8 марта, 9 мая и т.д.),
- иначе сезон (зима/весна/лето/осень).

Для зимних тем включается снег (`Snowfall`).

## Полезные команды

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint

# локально собрать как GitHub Pages
STATIC_EXPORT=true NEXT_PUBLIC_BASE_PATH=/mdc-player-statictics pnpm build
```

## Docker-файлы

- `Dockerfile` - multi-stage сборка (`deps`, `builder`, `runner`)
- `docker-compose.yml` - production и `app-dev` profile
- `.dockerignore` - ускорение сборки образа

## Troubleshooting

- `API timeout after ...`:
  - увеличить `NEXT_PUBLIC_MDC_API_TIMEOUT_MS`
  - увеличить `NEXT_PUBLIC_MDC_API_RETRY_ATTEMPTS`
- API из Postman работает, а в браузере нет:
  - проверить CORS ответа API и ограничения публичного proxy для Steam-аватарок.
