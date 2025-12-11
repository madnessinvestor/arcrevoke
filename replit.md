# Arc Revoke dApp

## Overview

Arc Revoke is a Web3 security application that enables users to manage and revoke ERC-20 token approvals on the Arc Testnet blockchain. The application helps users protect their wallets by identifying and revoking unlimited token allowances that could pose security risks. It features automatic approval detection by scanning blockchain events, manual revocation capabilities, and tracks aggregate statistics of revokes performed across all users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **UI Components**: shadcn/ui component library (New York style) with Radix UI primitives
- **Design Theme**: Cyberpunk/futuristic dark mode with custom fonts (Orbitron, Rajdhani, JetBrains Mono)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful JSON API under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Key API Endpoints
- `GET /api/stats` - Retrieve aggregate revoke statistics
- `POST /api/revoke` - Record a new token revoke action
- `GET /api/revokes/recent` - Get recent revoke history

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Tables**:
  - `users` - Basic user authentication
  - `revoke_stats` - Aggregate counters for total revokes and value secured
  - `revoke_history` - Individual revoke records with wallet, token, spender details

### Web3 Integration
- **Library**: ethers.js v6
- **Network**: Arc Testnet (Chain ID: 0x4CEF22 / 5042002)
- **Features**:
  - MetaMask wallet connection with automatic network switching
  - ERC-20 approval detection via event log scanning
  - Token revocation by setting approval to zero

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and configs
│   │   └── pages/        # Route pages
├── server/           # Express backend
│   ├── db.ts         # Database connection
│   ├── routes.ts     # API route handlers
│   └── storage.ts    # Data access layer
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle database schema
```

## External Dependencies

### Blockchain
- **Arc Testnet RPC**: `https://rpc.testnet.arc.network`
- **Block Explorer**: `https://testnet.arcscan.app`
- **Native Currency**: USDC (18 decimals)

### Database
- **PostgreSQL**: Connection via `DATABASE_URL` environment variable
- **Session Store**: connect-pg-simple for Express sessions

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (required for database operations)

### Key npm Packages
- `ethers` - Ethereum/Web3 interactions
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Data fetching and caching
- `@radix-ui/*` - Accessible UI primitives
- `tailwindcss` - Utility-first CSS framework