# ChatDraw - Real-time Chat Application

A modern real-time chat application built with Next.js, WebSocket, and PostgreSQL. Features room-based messaging, user authentication, typing indicators, and message persistence.

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Express.js (HTTP), ws (WebSocket)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Monorepo**: Turborepo with pnpm workspaces

## Project Structure

```
excelDraw/
├── apps/
│   ├── web/                 # Next.js frontend application
│   ├── http-backend/        # Express REST API server
│   └── websocket-backend/   # WebSocket server for real-time messaging
├── packages/
│   ├── db/                  # Prisma schema and database client
│   ├── backend-common/      # Shared configurations
│   └── common/              # Shared types and utilities
```

## Features

- User authentication (signup/signin) with JWT
- Room-based chat system
- Real-time messaging via WebSocket
- Typing indicators
- Online user presence
- Message history persistence
- Responsive UI with dark mode support
- Auto-scrolling chat interface

## Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database (Neon recommended)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create `.env` files in the respective directories:

**apps/http-backend/.env**
```
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
JWT_SECRET="your-secret-key"
PORT=3002
```

**apps/web/.env**
```
NEXT_PUBLIC_API_URL="http://localhost:3002"
NEXT_PUBLIC_WS_URL="ws://localhost:8080"
```

### 3. Run Database Migrations

```bash
cd packages/db
npx prisma migrate dev
```

### 4. Start Development Servers

Run all services in parallel:

```bash
pnpm dev
```

Or run individual services:

```bash
# Frontend (http://localhost:3000)
cd apps/web && pnpm dev

# HTTP Backend (http://localhost:3002)
cd apps/http-backend && pnpm dev

# WebSocket Server (ws://localhost:8080)
cd apps/websocket-backend && pnpm dev
```

## API Endpoints

### Authentication

- `POST /users/signup` - Create new account
- `POST /users/signin` - Login to existing account

### Rooms

- `POST /rooms/create-room` - Create a new chat room
- `GET /rooms/:slug/chats` - Get chat history for a room

### WebSocket Events

**Client → Server:**
- `join_room` - Join a chat room
- `leave_room` - Leave a chat room
- `chat` - Send a message
- `typing` - Send typing indicator

**Server → Client:**
- `presence` - User joined/left events
- `chat` - New message received
- `typing` - Typing indicator updates
- `error` - Error messages

## Building for Production

```bash
pnpm build
```

## License

MIT
