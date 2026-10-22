# FitsiteGonga Backend API

Express API for FitsiteGonga with Prisma/PostgreSQL, JWT auth, Socket.io, and local disk uploads.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Default API URL: `http://localhost:4000`

## Environment

- `DATABASE_URL` - PostgreSQL connection string.
- `JWT_SECRET` - Access-token signing secret.
- `JWT_REFRESH_SECRET` - Refresh-token signing secret.
- `LOCAL_STORAGE_DIR` - Optional upload directory. Defaults to `backend/uploads`.
- `FRONTEND_URL` - Frontend origin for CORS. Defaults to `http://localhost:3000`.
- `PORT` - Server port. Defaults to `4000`.

## Storage

Uploaded files are written to local disk. The backend serves them through:

- `GET /api/media/*`

Upload helpers:

- `POST /api/storage/upload-url`
- `POST /api/storage/upload-url/progress-photo`
- `PUT /api/storage/upload?key=...`
- `DELETE /api/storage/:key`

Server-side multipart uploads for avatars, meals, and chat media write directly to the same local storage service.

## Core Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/workouts/templates`
- `GET /api/programs`
- `GET /api/nutrition/meals`
- `GET /api/messages/global`

## Development

```bash
npm run dev
npm run build
npx prisma validate
```
