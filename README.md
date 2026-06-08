# AP Agent

AI-powered Accounts Payable workflow application for invoice intake, vendor intelligence, exception tracking, decision audit trails, and agent-assisted risk analysis.

## Overview

This repository is a `pnpm` workspace that contains:

- A React + Vite frontend for AP operations
- An Express API server for business logic and AI orchestration
- Shared libraries for database access, API schemas, and generated client types
- Docker support for running the full stack in containers

The project is designed to help AP teams:

- review invoices
- analyze vendor behavior
- detect exceptions and risks
- preserve memory of previous decisions
- inspect AI-generated reasoning and audit logs

## Main Features

- Dashboard with invoice and risk summaries
- Invoice inbox with analysis flow
- Vendor intelligence pages with trust and dispute signals
- Exception log and resolution workflow
- Memory explorer for agent memory events
- Decision audit pages for explainability
- Settings for thresholds and operational behavior

## Architecture

### Frontend

- Location: `artifacts/ap-agent`
- Stack: React, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter
- Default local dev port: `5173`

### Backend

- Location: `artifacts/api-server`
- Stack: Express 5, TypeScript, esbuild
- Default API port: `4000`
- Exposes API routes under `/api`

### Shared Libraries

- `lib/db`: Drizzle ORM schema and database connection utilities
- `lib/api-spec`: OpenAPI contract and codegen config
- `lib/api-zod`: generated Zod-based API types
- `lib/api-client-react`: generated React client helpers

## Repository Structure

```text
.
|-- artifacts/
|   |-- ap-agent/           # Frontend app
|   |-- api-server/         # Backend API
|   `-- mockup-sandbox/     # Sandbox UI workspace
|-- lib/
|   |-- api-client-react/   # Generated API client
|   |-- api-spec/           # OpenAPI source
|   |-- api-zod/            # Generated schema/types
|   `-- db/                 # Drizzle schema and DB utilities
|-- scripts/                # Utility scripts
|-- Dockerfile.backend
|-- Dockerfile.frontend
|-- docker-compose.yml
`-- nginx.conf
```

## Tech Stack

- Node.js 22+
- pnpm workspaces
- TypeScript
- React + Vite
- Express
- PostgreSQL + Drizzle ORM
- Groq for LLM-powered reasoning
- Gemini for OCR/document extraction
- Docker + Docker Compose

## Prerequisites

Install the following before running the project:

- Node.js `22` or later
- `pnpm`
- Docker Desktop
- A PostgreSQL-compatible database
- API keys for the AI services you want to use

## Environment Variables

Create a root `.env` file before starting the backend or Docker stack.

### Quick Setup

```powershell
Copy-Item .env.example .env
```

### Required

- `DATABASE_URL`: PostgreSQL connection string used by `lib/db`
- `GROQ_API_KEY`: enables Groq-backed agent reasoning

### Recommended

- `GEMINI_API_KEY`: required for OCR/document parsing flows
- `SUPABASE_URL`: include if your deployment or integrations expect it
- `LOG_LEVEL`: backend logger level, for example `info` or `debug`

### Example

```env
SUPABASE_URL=https://your-project-ref.supabase.co
DATABASE_URL=postgresql://postgres.<project-ref>:<database-password>@<pooler-host>:6543/postgres?sslmode=require&uselibpqcompat=true
GROQ_API_KEY=<groq-api-key>
GEMINI_API_KEY=<gemini-api-key>
LOG_LEVEL=info
```

## Install Dependencies

Run this once from the repository root:

```bash
pnpm install
```

## Run Locally

Use two terminals from the project root.

### 1. Start the Backend

```bash
pnpm --filter @workspace/api-server run dev
```

The API starts on:

- `http://localhost:4000`
- health check: `http://localhost:4000/api/health`

### 2. Start the Frontend

```bash
pnpm --filter @workspace/ap-agent run dev
```

The frontend starts on:

- `http://localhost:5173`

### Local Development Summary

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/ap-agent run dev
```

## Build Commands

### Full Workspace Typecheck + Build

```bash
pnpm run build
```

### Typecheck Only

```bash
pnpm run typecheck
```

### Regenerate API Client and Schemas

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Push Database Schema

```bash
pnpm --filter @workspace/db run push
```

## Run With Docker

The recommended Docker workflow is `docker compose` because:

- the frontend Nginx config proxies `/api` to the `backend` service
- the backend and frontend need to share the same Compose network

### 1. Prepare Environment File

```powershell
Copy-Item .env.example .env
```

Edit `.env` and add your real values before starting containers.

### 2. Build and Start Containers

```bash
docker compose up --build
```

### 3. Run in Detached Mode

```bash
docker compose up --build -d
```

### 4. Open the App

- Frontend: `http://localhost:8080`
- Backend health check: `http://localhost:4000/api/health`

### 5. Stop Containers

```bash
docker compose down
```

### 6. Rebuild After Code Changes

```bash
docker compose up --build -d
```

### 7. View Logs

```bash
docker compose logs -f
```

### 8. View Logs for a Single Service

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

## Docker Images

The Compose file builds these image tags:

- `ap-agent-backend:latest`
- `ap-agent-frontend:latest`

Build them explicitly with:

```bash
docker compose build
```

## Push Docker Images

If you want to push the updated images to Docker Hub or another registry, tag and push them after a successful build.

### Example Docker Hub Push

Replace `your-dockerhub-username` with your registry namespace.

```bash
docker compose build
docker tag ap-agent-backend:latest your-dockerhub-username/ap-agent-backend:latest
docker tag ap-agent-frontend:latest your-dockerhub-username/ap-agent-frontend:latest
docker push your-dockerhub-username/ap-agent-backend:latest
docker push your-dockerhub-username/ap-agent-frontend:latest
```

### Example Versioned Push

```bash
docker tag ap-agent-backend:latest your-dockerhub-username/ap-agent-backend:v1
docker tag ap-agent-frontend:latest your-dockerhub-username/ap-agent-frontend:v1
docker push your-dockerhub-username/ap-agent-backend:v1
docker push your-dockerhub-username/ap-agent-frontend:v1
```

## API Notes

- The API is mounted under `/api`
- The health route is available at `/api/health`
- Static uploads are served from `/uploads`

## Operational Notes

- The backend requires `DATABASE_URL` at startup
- AI reasoning degrades if `GROQ_API_KEY` is missing
- OCR flows fail if `GEMINI_API_KEY` is missing
- The frontend Docker container is intended to run through Compose, not standalone, because it proxies API requests to the `backend` service name

## Troubleshooting

### Backend fails on startup

Check:

- `.env` exists at the repository root
- `DATABASE_URL` is valid
- `PORT` is not overridden with an invalid value

### Frontend loads but API calls fail

Check:

- the backend container is healthy
- `docker compose ps` shows both services running
- the backend responds at `http://localhost:4000/api/health`

### Docker build fails

Try:

```bash
docker compose build --no-cache
```

### Clean Docker State

```bash
docker compose down --remove-orphans
```

## Useful Commands

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/ap-agent run dev
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
docker compose up --build -d
docker compose logs -f
docker compose down
```
