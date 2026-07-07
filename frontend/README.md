# New Frontend

Новый React-фронтенд для Kcell Mergen на Vite, TypeScript и Tailwind CSS.

## Запуск

```bash
npm install
npm run dev
```

Перед запуском скопируй `.env.example` в `.env`, если backend работает не на `http://localhost:8000`.

## Где подключать backend

- `src/api/endpoints.ts` - все пути к backend endpoint'ам.
- `src/api/client.ts` - общий HTTP-клиент с JSON, FormData, Bearer token и refresh token.
- `src/api/resources.ts` - готовые методы для auth, users, controls, tasks, incidents, mfs, notifications и vacation schedule.
- `src/types/api.ts` - базовые TypeScript-типы под текущие backend-схемы.
