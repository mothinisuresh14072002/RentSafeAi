# RentSafe AI - Quick Start Guide

## Prerequisites

Ensure you have these installed on your Windows machine:

1. **Node.js** (v20 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **pnpm** (v9 or higher)
   - Install: `npm install -g pnpm`
   - Verify: `pnpm --version`

3. **Docker Desktop** (for PostgreSQL, Redis, MinIO)
   - Download: https://www.docker.com/products/docker-desktop/
   - Start Docker Desktop before proceeding

4. **Git** (if not already installed)
   - Download: https://git-scm.com/download/win

---

## Step 1: Install Dependencies

Open PowerShell in the project root:

```powershell
# Navigate to project root
cd e:\RentSafeAi\rent-safe-ai

# Install all dependencies (root + all workspaces)
pnpm install
```

This installs dependencies for:
- Root workspace
- `apps/api` (NestJS backend)
- `apps/web` (Next.js frontend)
- `apps/mobile` (React Native - not needed for portals)
- `packages/*`

Expected output: `✓ Done in X.Xs`

---

## Step 2: Start Infrastructure Services

Start PostgreSQL, Redis, MinIO, and Mailpit using Docker:

```powershell
# From project root
docker-compose up -d
```

**Services started**:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO (S3): `localhost:9000` (Console: `localhost:9001`)
- Mailpit (SMTP): `localhost:1025` (UI: `localhost:8025`)
- pgAdmin: `localhost:5050`

**Verify containers are running**:
```powershell
docker ps
```

You should see 5 containers running.

---

## Step 3: Set Up Database

### 3a. Run Prisma Migrations

```powershell
# Navigate to API directory
cd apps\api

# Generate Prisma client
pnpm prisma generate

# Run migrations (creates all tables)
pnpm prisma migrate dev --name init

# Optional: Open Prisma Studio to view/edit data
pnpm prisma studio
```

Prisma Studio opens at: http://localhost:5555

### 3b. Seed Database (Optional)

```powershell
# Still in apps/api directory
pnpm prisma db seed
```

This creates test users and sample data.

---

## Step 4: Install New Frontend Dependencies

```powershell
# Navigate to web app
cd e:\RentSafeAi\rent-safe-ai\apps\web

# Install Leaflet (maps) and drag-and-drop libraries
pnpm add leaflet react-leaflet @types/leaflet @dnd-kit/core @dnd-kit/sortable
```

---

## Step 5: Configure Environment Variables

All required environment files are already created. Verify they exist:

### API Environment (apps/api/.env)
```powershell
cat apps\api\.env
```

Should show:
- `PORT=3001`
- `DATABASE_URL=postgresql://...`
- `REDIS_URL=redis://localhost:6379`
- etc.

### Web Environment (apps/web/.env.local)
```powershell
cat apps\web\.env.local
```

Should show:
- `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`

**✅ Both files are already configured!**

---

## Step 6: Add ToastProvider to Root Layout

Edit `apps/web/src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";  // ADD THIS

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RentSafe AI",
  description: "Secure rental verification platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>  {/* ADD THIS */}
          {children}
        </ToastProvider>  {/* ADD THIS */}
      </body>
    </html>
  );
}
```

---

## Step 7: Add Leaflet CSS

Edit `apps/web/src/app/globals.css` and add at the top:

```css
@import 'leaflet/dist/leaflet.css';

/* Rest of your existing styles... */
```

---

## Step 8: Start Development Servers

Open **3 separate PowerShell terminals**:

### Terminal 1: API Server
```powershell
cd e:\RentSafeAi\rent-safe-ai\apps\api
pnpm dev
```

Expected output:
```
[Nest] INFO Application listening on port 3001
```

**API runs at**: http://localhost:3001

### Terminal 2: Web Frontend
```powershell
cd e:\RentSafeAi\rent-safe-ai\apps\web
pnpm dev
```

Expected output:
```
✓ Ready in 2.5s
- Local:   http://localhost:3000
```

**Web runs at**: http://localhost:3000

### Terminal 3: Turbo Dev (Optional - runs both)
```powershell
cd e:\RentSafeAi\rent-safe-ai
pnpm dev
```

This starts both API and Web using Turborepo.

---

## Step 9: Access the Application

### Main URLs

1. **Landing Page**: http://localhost:3000
   - Choose "Property Owner" or "Reviewer"

2. **Login Page**: http://localhost:3000/login
   - Enter a 10-digit Indian mobile number (e.g., `9876543210`)

3. **OTP Verification**: http://localhost:3000/login/otp
   - Check the **API terminal** for the 6-digit OTP code
   - In development, OTPs are logged to console

4. **Owner Dashboard**: http://localhost:3000/owner/dashboard
   - After login as OWNER

5. **Reviewer Dashboard**: http://localhost:3000/reviewer/dashboard
   - After login as REVIEWER

6. **API Swagger**: http://localhost:3001/api/docs
   - Interactive API documentation (if `ENABLE_SWAGGER=true`)

### Supporting Tools

- **Prisma Studio**: http://localhost:5555 (run `pnpm prisma studio` in apps/api)
- **pgAdmin**: http://localhost:5050
  - Email: `admin@rentsafe.local`
  - Password: `admin`
- **Mailpit**: http://localhost:8025 (email testing UI)
- **MinIO Console**: http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin`

---

## Step 10: Create Test Users

### Option A: Using Prisma Studio (Easiest)

1. Open Prisma Studio: `cd apps\api && pnpm prisma studio`
2. Navigate to **User** table
3. Click "Add record"
4. Fill in:
   - `phone`: `+919876543210`
   - `email`: `owner@test.com`
   - `hashedPassword`: `PASSWORDLESS` (we use OTP only)
   - `role`: `OWNER` (or `REVIEWER`)
   - `status`: `ACTIVE`
   - `isPhoneVerified`: `true`
5. Save

### Option B: Using SQL

Connect to PostgreSQL and run:

```sql
-- Create an Owner user
INSERT INTO users (id, phone, email, "hashedPassword", role, status, "isPhoneVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '+919876543210',
  'owner@test.com',
  'PASSWORDLESS',
  'OWNER',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);

-- Create a Reviewer user
INSERT INTO users (id, phone, email, "hashedPassword", role, status, "isPhoneVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '+919876543211',
  'reviewer@test.com',
  'PASSWORDLESS',
  'REVIEWER',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);
```

---

## Testing the Auth Flow

1. **Go to login page**: http://localhost:3000/login
2. **Enter phone**: `9876543210`
3. **Click "Send OTP"**
4. **Check API terminal** for output like:
   ```
   [LocalOtpProvider] OTP for +919876543210: 123456
   ```
5. **Enter the OTP**: `123456`
6. **Click "Verify & Sign In"**
7. **You're redirected** based on role:
   - OWNER → http://localhost:3000/owner/dashboard
   - REVIEWER → http://localhost:3000/reviewer/dashboard

---

## Common Issues & Fixes

### Issue: "Cannot connect to database"

**Fix**:
```powershell
# Check Docker is running
docker ps

# Restart containers
docker-compose down
docker-compose up -d

# Wait 10 seconds, then retry
```

### Issue: "Port 3001 already in use"

**Fix**:
```powershell
# Find process using port
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or change port in apps/api/.env
```

### Issue: "Module not found" errors

**Fix**:
```powershell
# Clean install
cd e:\RentSafeAi\rent-safe-ai
rm -r node_modules
rm -r apps\api\node_modules
rm -r apps\web\node_modules
pnpm install
```

### Issue: Prisma errors

**Fix**:
```powershell
cd apps\api

# Regenerate Prisma client
pnpm prisma generate

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Or just run migrations
pnpm prisma migrate dev
```

### Issue: OTP not showing in terminal

**Fix**: 
- Check the **API terminal** (not web terminal)
- Look for `[LocalOtpProvider] OTP for...`
- If using production mode, OTPs won't be logged (by design)

---

## Development Workflow

### Making Changes

1. **Edit code** in your IDE
2. **Changes auto-reload**:
   - API: Nest watches for changes
   - Web: Next.js Fast Refresh

### Running Type Checks

```powershell
# Check all workspaces
pnpm typecheck

# Or individual
cd apps\web
pnpm typecheck
```

### Running Linter

```powershell
# Lint all workspaces
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix
```

### Building for Production

```powershell
# Build all workspaces
pnpm build

# Build specific app
cd apps\api
pnpm build
```

---

## Stopping the Application

### Stop Dev Servers
Press `Ctrl+C` in each terminal running `pnpm dev`

### Stop Docker Services
```powershell
docker-compose down
```

### Stop Docker + Remove Volumes (resets database)
```powershell
docker-compose down -v
```

---

## Project Structure

```
e:\RentSafeAi\rent-safe-ai\
├── apps/
│   ├── api/               # NestJS backend (port 3001)
│   │   ├── src/
│   │   ├── prisma/
│   │   └── .env
│   ├── web/               # Next.js frontend (port 3000)
│   │   ├── src/
│   │   │   ├── app/       # Pages (App Router)
│   │   │   ├── components/ # UI components
│   │   │   ├── lib/       # Utilities
│   │   │   └── hooks/     # React hooks
│   │   └── .env.local
│   └── mobile/            # React Native (not needed)
├── packages/
│   └── config/            # Shared ESLint config
├── .kiro/
│   ├── specs/             # Full specifications
│   └── IMPLEMENTATION_STATUS.md
├── docker-compose.yaml
├── package.json
└── pnpm-workspace.yaml
```

---

## Next Steps

1. ✅ **Application is running!**
2. 📖 Read **IMPLEMENTATION_STATUS.md** for architecture details
3. 🎨 Explore the **Owner Portal**:
   - Dashboard: http://localhost:3000/owner/dashboard
   - Profile: http://localhost:3000/owner/profile
   - (More pages to be implemented)
4. 🔍 Explore the **Reviewer Portal**:
   - Dashboard: http://localhost:3000/reviewer/dashboard
   - (More pages to be implemented)
5. 📚 Read the **full spec** in `.kiro/specs/owner-reviewer-portals/`

---

## Getting Help

- **Implementation Status**: `.kiro/IMPLEMENTATION_STATUS.md`
- **Requirements**: `.kiro/specs/owner-reviewer-portals/requirements.md`
- **Design**: `.kiro/specs/owner-reviewer-portals/design.md`
- **Tasks**: `.kiro/specs/owner-reviewer-portals/tasks.md`

---

## Summary Commands

```powershell
# One-time setup
cd e:\RentSafeAi\rent-safe-ai
pnpm install
docker-compose up -d
cd apps\api
pnpm prisma generate
pnpm prisma migrate dev
cd ..\web
pnpm add leaflet react-leaflet @types/leaflet @dnd-kit/core @dnd-kit/sortable

# Every time you develop
docker-compose up -d
# Terminal 1: cd apps\api && pnpm dev
# Terminal 2: cd apps\web && pnpm dev

# Access
# Web: http://localhost:3000
# API: http://localhost:3001
```

**Happy Coding! 🚀**
