# TROUBLESHOOTING.md

> **Last Updated**: 2025-10-24
> **Purpose**: Common issues and solutions for development and production

---

## Quick Reference

**Common Issues**:
1. [Development Environment](#1-development-environment-setup-issues)
2. [API Connection](#2-api-connection-issues)
3. [Database](#3-database-issues)
4. [Socket.io](#4-socketio-connection-issues)
5. [Build/Deployment](#5-builddeployment-errors)
6. [Performance](#6-performance-debugging)
7. [Authentication](#7-authentication-issues)
8. [Crawler](#8-crawler-issues)

---

## 1. Development Environment Setup Issues

### 1.1 Port Already in Use

**Symptoms**:
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solution**:
```bash
# Use kill script
cd servers/friendly
npm run kill

# Or find and kill process manually (Windows)
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Or find and kill process manually (Mac/Linux)
lsof -i :4000
kill -9 <PID>
```

**Prevention**: Always use `npm run dev:clean` instead of `npm run dev`

---

### 1.2 Node Modules Missing

**Symptoms**:
```
Error: Cannot find module 'fastify'
```

**Solution**:
```bash
# Install dependencies
cd servers/friendly
npm install

# If persistent, clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

### 1.3 TypeScript Compilation Errors

**Symptoms**:
```
error TS2307: Cannot find module '@routes/auth.routes'
```

**Solution**:
```bash
# Check tsconfig.json paths are correct
# Restart TypeScript server in VSCode
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# If persistent, rebuild
npm run build
```

---

### 1.4 Python Environment Issues

**Symptoms**:
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution**:
```bash
# Create virtual environment
cd servers/smart
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 2. API Connection Issues

### 2.1 Mobile App Cannot Connect to Backend

**Symptoms**:
- Web app works, mobile app shows network errors
- iOS: `Network request failed`
- Android: `Failed to fetch`

**Root Cause**: Mobile app uses `localhost` which points to the device, not the host machine

**Solution**:

#### iOS Simulator
```typescript
// apps/shared/services/api.service.ts
const API_URL = Platform.OS === 'ios'
  ? 'http://localhost:4000'  // ✅ localhost works on iOS simulator
  : 'http://10.0.2.2:4000'   // Android emulator
```

#### Android Emulator
```typescript
const API_URL = 'http://10.0.2.2:4000'  // ✅ Special alias for host machine
```

#### Physical Device
```bash
# 1. Find your local IP
# Windows
ipconfig
# Look for "IPv4 Address" (e.g., 192.168.1.100)

# Mac/Linux
ifconfig
# Look for "inet" under en0 or wlan0

# 2. Use local IP in API_URL
const API_URL = 'http://192.168.1.100:4000'

# 3. Ensure backend binds to 0.0.0.0
# config/base.yml
server:
  host: 0.0.0.0  # NOT localhost
  port: 4000
```

**Verification**:
```bash
# Test from mobile browser
# Open Safari/Chrome on device
# Navigate to: http://192.168.1.100:4000/api/health

# Should return: {"status":"ok"}
```

---

### 2.2 CORS Errors

**Symptoms**:
```
Access to fetch at 'http://localhost:4000/api/auth/login' from origin
'http://localhost:3000' has been blocked by CORS policy
```

**Solution**:
```typescript
// servers/friendly/src/server.ts
import cors from '@fastify/cors'

app.register(cors, {
  origin: [
    'http://localhost:3000',        // Web dev
    'http://localhost:19006',       // Mobile dev (Expo)
    'http://192.168.1.100:3000',    // Your local IP
    process.env.PRODUCTION_URL
  ],
  credentials: true
})
```

---

### 2.3 API Returns 404 Not Found

**Symptoms**:
```
GET http://localhost:4000/api/restaurants/categories → 404
```

**Diagnosis Steps**:
```bash
# 1. Check server logs for registered routes
npm run dev
# Look for: "Routes registered: /api/restaurants/categories"

# 2. Check if route file is imported
# servers/friendly/src/server.ts
import restaurantRoutes from '@routes/restaurant.routes'
app.register(restaurantRoutes)

# 3. Test directly with curl
curl http://localhost:4000/api/restaurants/categories

# 4. Check API documentation
# Open http://localhost:4000/docs
```

---

### 2.4 Request Timeout

**Symptoms**:
```
Error: timeout of 30000ms exceeded
```

**Solution**:
```typescript
// Increase timeout for slow operations (crawling)
// apps/shared/services/api.service.ts
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal: AbortSignal.timeout(60000)  // 60 seconds
})
```

---

## 3. Database Issues

### 3.1 Database Locked

**Symptoms**:
```
Error: SQLITE_BUSY: database is locked
```

**Root Cause**: Multiple connections writing simultaneously without WAL mode

**Solution**:
```bash
# 1. Enable WAL mode
# servers/friendly/src/db/database.ts
await db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
`)

# 2. If persistent, reset database
cd servers/friendly
npm run db:reset
```

---

### 3.2 Migration Fails

**Symptoms**:
```
Error: Migration 004_add_jobs_table.sql failed
```

**Solution**:
```bash
# 1. Check migration SQL syntax
# Open: servers/friendly/src/db/migrations/004_add_jobs_table.sql

# 2. Reset and re-run
npm run db:reset

# 3. If specific migration fails, fix SQL and re-run
npm run dev
```

---

### 3.3 Foreign Key Constraint Failed

**Symptoms**:
```
Error: FOREIGN KEY constraint failed
```

**Solution**:
```typescript
// ❌ Wrong - restaurant doesn't exist
await db.run('INSERT INTO menus (restaurant_id, ...) VALUES (999, ...)')

// ✅ Correct - check restaurant exists first
const restaurant = await db.get('SELECT id FROM restaurants WHERE id = ?', [restaurantId])
if (!restaurant) {
  throw new Error('Restaurant not found')
}
await db.run('INSERT INTO menus (restaurant_id, ...) VALUES (?, ...)', [restaurantId, ...])
```

---

### 3.4 Duplicate Entry Error

**Symptoms**:
```
Error: UNIQUE constraint failed: users.email
```

**Solution**:
```typescript
// Use UPSERT pattern for idempotent operations
await db.run(`
  INSERT INTO restaurants (place_id, name, ...)
  VALUES (?, ?, ...)
  ON CONFLICT(place_id) DO UPDATE SET
    name = excluded.name,
    updated_at = datetime('now', 'localtime')
`, [placeId, name, ...])
```

---

### 3.5 Query Returns Unexpected NULL

**Symptoms**:
```typescript
const user = await db.get('SELECT * FROM users WHERE email = ?', [email])
// user is undefined
```

**Diagnosis**:
```sql
-- Check if data exists
SELECT * FROM users;

-- Check exact match (case-sensitive)
SELECT * FROM users WHERE email = 'test@example.com';

-- Use case-insensitive search
SELECT * FROM users WHERE LOWER(email) = LOWER('test@example.com');
```

---

## 4. Socket.io Connection Issues

### 4.1 Socket Not Connecting

**Symptoms**:
- Web: `socket.connected === false`
- DevTools Console: `WebSocket connection failed`

**Diagnosis**:
```typescript
// apps/shared/contexts/SocketContext.tsx
useEffect(() => {
  console.log('Socket connected:', socket.connected)
  console.log('Socket ID:', socket.id)
}, [socket.connected])
```

**Solution**:
```bash
# 1. Check server is running
curl http://localhost:4000/api/health

# 2. Check Socket.io endpoint
# servers/friendly/src/socket/socket.ts
export function initializeSocket(app: FastifyInstance) {
  const io = new Server(app.server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:19006'],
      credentials: true
    }
  })
}

# 3. Check client URL
# apps/shared/contexts/SocketContext.tsx
const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling']
})
```

---

### 4.2 Events Not Received

**Symptoms**:
```typescript
socket.on('review:started', (data) => {
  console.log('Never logged')
})
```

**Diagnosis**:
```typescript
// 1. Check event name matches exactly
// Server: socket/events.ts
export const SOCKET_EVENTS = {
  REVIEW_STARTED: 'review:started',  // ✅ Correct
}

// Client: shared/utils/socket.utils.ts
export const SOCKET_EVENTS = {
  REVIEW_STARTED: 'review:started',  // ✅ Must match
}

// 2. Log all events
socket.onAny((eventName, ...args) => {
  console.log('Socket event received:', eventName, args)
})

// 3. Check room subscription
socket.emit('subscribe:restaurant', restaurantId)
```

---

### 4.3 Progress Updates Missing

**Symptoms**: Crawling starts but progress stays at 0%

**Solution**:
```typescript
// Ensure callbacks are set BEFORE subscribing to room
// ❌ Wrong order
joinRestaurantRoom(restaurantId)
setRestaurantCallbacks({ onReviewCrawlCompleted: ... })

// ✅ Correct order
setRestaurantCallbacks({ onReviewCrawlCompleted: ... })
joinRestaurantRoom(restaurantId)
```

---

### 4.4 Multiple Event Handlers

**Symptoms**: Event handler fires multiple times

**Root Cause**: Event listeners not cleaned up

**Solution**:
```typescript
// ✅ Use useEffect cleanup
useEffect(() => {
  const handleProgress = (data: JobEventData) => {
    console.log('Progress:', data)
  }

  socket.on('review:crawl_progress', handleProgress)

  return () => {
    socket.off('review:crawl_progress', handleProgress)
  }
}, [])
```

---

## 5. Build/Deployment Errors

### 5.1 Vite Build Fails

**Symptoms**:
```
error during build:
RollupError: Could not resolve "@shared/components"
```

**Solution**:
```typescript
// apps/web/vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      'react-native': 'react-native-web'
    }
  }
})
```

---

### 5.2 TypeScript Build Errors in Production

**Symptoms**:
```
npm run build
error TS2322: Type 'string' is not assignable to type 'number'
```

**Solution**:
```bash
# Use production tsconfig
# servers/friendly/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "e2e/**"]
}

# Build with production config
npm run build
```

---

### 5.3 Metro Bundler Cache Issues

**Symptoms**:
```
Error: Unable to resolve module `@babel/runtime/helpers/interopRequireDefault`
```

**Solution**:
```bash
# Clear all caches
cd apps/mobile
rm -rf node_modules
npm cache clean --force
npm install

# Reset Metro bundler cache
npx react-native start --reset-cache
```

---

### 5.4 Production Build Too Large

**Symptoms**:
```
warning: Bundle size exceeds 500kb
```

**Solution**:
```typescript
// apps/web/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'socket': ['socket.io-client']
        }
      }
    }
  }
})
```

**See Also**: [PERFORMANCE.md](./PERFORMANCE.md) - Section 7 (Build Optimization)

---

## 6. Performance Debugging

### 6.1 Slow API Response

**Diagnosis**:
```typescript
// Add timing logs
// servers/friendly/src/routes/restaurant.routes.ts
app.get('/api/restaurants', async (request, reply) => {
  const startTime = Date.now()

  const restaurants = await restaurantService.list(limit, offset, category)

  const duration = Date.now() - startTime
  app.log.info(`GET /api/restaurants took ${duration}ms`)

  return reply.send(restaurants)
})
```

**Common Issues**:
1. **N+1 Queries**: See [PERFORMANCE.md](./PERFORMANCE.md) - Section 2.1.1
2. **Missing Index**: See [PERFORMANCE.md](./PERFORMANCE.md) - Section 3.3
3. **Large Payload**: See [PERFORMANCE.md](./PERFORMANCE.md) - Section 4.2

---

### 6.2 React Component Re-rendering

**Diagnosis**:
```typescript
// Install React DevTools Profiler
// Record interaction
// Check "Ranked" tab for slow components

// Add manual logging
useEffect(() => {
  console.log('Component re-rendered')
})
```

**Solution**: Use React.memo, useMemo, useCallback

**See Also**: [PERFORMANCE.md](./PERFORMANCE.md) - Section 1.1

---

### 6.3 Socket.io Lag

**Symptoms**: Progress updates arrive 5-10 seconds late

**Solution**:
```typescript
// Enable compression for large payloads
// servers/friendly/src/socket/socket.ts
const io = new Server(app.server, {
  transports: ['websocket'],  // Disable polling
  perMessageDeflate: {
    threshold: 1024  // Compress messages > 1KB
  }
})
```

**See Also**: [PERFORMANCE.md](./PERFORMANCE.md) - Section 5.3

---

### 6.4 Puppeteer Memory Leak

**Symptoms**: Server memory grows continuously during crawling

**Solution**:
```typescript
// ✅ Always close browser
// servers/friendly/src/services/naver-crawler.service.ts
async scrapeRestaurantInfo(url: string) {
  const browser = await puppeteer.launch()
  try {
    const page = await browser.newPage()
    // ... scraping logic
    return data
  } finally {
    await browser.close()  // ✅ Always close
  }
}
```

**See Also**: [PERFORMANCE.md](./PERFORMANCE.md) - Section 2.2

---

## 7. Authentication Issues

### 7.1 Login Fails with Correct Credentials

**Symptoms**:
```json
{
  "result": false,
  "message": "Invalid credentials"
}
```

**Diagnosis**:
```bash
# Check user exists
sqlite3 servers/friendly/data/niney.db
SELECT * FROM users WHERE email = 'test@example.com';

# Check password hash
SELECT password_hash FROM users WHERE email = 'test@example.com';
```

**Common Issues**:
1. **Case Sensitivity**: Email must match exactly (or use `LOWER(email)`)
2. **Whitespace**: `'test@example.com '` ≠ `'test@example.com'`
3. **Password Hash Mismatch**: Re-register user

---

### 7.2 User Not Persisted After Login

**Symptoms**: User logged in but `useAuth()` shows `isAuthenticated: false` after refresh

**Diagnosis**:
```typescript
// Check storage
import { storage } from '@shared/utils'

const user = await storage.getUserInfo()
console.log('Stored user:', user)
```

**Solution**:
```typescript
// Ensure login sets storage
// apps/shared/hooks/useLogin.ts
const handleLogin = async () => {
  const data = await apiService.login({ email, password })
  await storage.setUserInfo(data.user)  // ✅ Must call this
}
```

---

### 7.3 Session Expires Immediately

**Symptoms**: User logged out after closing app/tab

**Root Cause**: Storage not persisting

**Solution**:
```typescript
// Web: Ensure localStorage is not cleared
// Mobile: Ensure AsyncStorage is not cleared

// Check browser settings
// DevTools → Application → Local Storage → http://localhost:3000
// Should see: user_info, app_theme

// Check AsyncStorage (React Native Debugger)
// AsyncStorage → user_info
```

---

### 7.4 JWT Token Invalid (Future)

**Note**: JWT not yet implemented, but common issues:

**Symptoms**:
```json
{
  "result": false,
  "message": "Invalid token"
}
```

**Diagnosis**:
```typescript
// Check token expiry
const decoded = jwt.decode(token)
console.log('Token expires at:', new Date(decoded.exp * 1000))

// Check token signature
jwt.verify(token, process.env.JWT_SECRET)
```

---

## 8. Crawler Issues

### 8.1 Restaurant Not Found

**Symptoms**:
```json
{
  "result": false,
  "message": "Failed to scrape restaurant info"
}
```

**Diagnosis**:
```bash
# Test URL manually
# Open URL in browser and check if page loads

# Check URL format
# ✅ Correct: https://m.place.naver.com/restaurant/1234567890
# ❌ Wrong: https://place.naver.com/restaurant/1234567890 (desktop URL)
```

**Solution**:
```typescript
// Crawler auto-converts to mobile URL
// But ensure Place ID is correct

// Extract Place ID from URL
const placeId = url.match(/\/restaurant\/(\d+)/)?.[1]
console.log('Place ID:', placeId)
```

---

### 8.2 Puppeteer Launch Fails

**Symptoms**:
```
Error: Failed to launch the browser process!
```

**Solution**:
```bash
# Install Chrome/Chromium
# Windows: Download Chrome from https://www.google.com/chrome/
# Mac: brew install --cask google-chrome
# Linux: apt-get install chromium-browser

# Or use bundled Chromium
npm install puppeteer
# Puppeteer downloads Chromium automatically
```

---

### 8.3 Timeout During Crawling

**Symptoms**:
```
Error: Navigation timeout of 30000 ms exceeded
```

**Solution**:
```typescript
// Increase timeout
// servers/friendly/src/services/naver-crawler.service.ts
await page.goto(url, {
  waitUntil: 'networkidle2',
  timeout: 60000  // 60 seconds
})

// Or disable timeout for slow networks
await page.goto(url, { timeout: 0 })
```

---

### 8.4 Images Not Downloading

**Symptoms**: Menus/reviews scraped but `image: null`

**Diagnosis**:
```typescript
// Check image URL
const imageUrl = await page.$eval('.img_thumb img', el => el.src)
console.log('Image URL:', imageUrl)

// Check if image is accessible
const response = await fetch(imageUrl)
console.log('Image status:', response.status)
```

**Solution**:
```typescript
// Ensure image directory exists
// servers/friendly/src/services/naver-crawler.service.ts
const dir = path.join(process.cwd(), 'data', 'menu-images', placeId)
await fs.mkdir(dir, { recursive: true })  // ✅ Create if missing
```

---

### 8.5 Duplicate Reviews

**Symptoms**: Same review appears multiple times in database

**Solution**:
```sql
-- reviews table uses review_hash for deduplication
CREATE UNIQUE INDEX idx_review_hash ON reviews(review_hash);

-- Check for duplicates
SELECT review_hash, COUNT(*)
FROM reviews
GROUP BY review_hash
HAVING COUNT(*) > 1;
```

**Prevention**:
```typescript
// Use UPSERT in repository
// servers/friendly/src/db/repositories/review.repository.ts
await db.run(`
  INSERT INTO reviews (review_hash, ...)
  VALUES (?, ...)
  ON CONFLICT(review_hash) DO NOTHING
`, [hash, ...])
```

---

### 8.6 Job Stuck in "Active" Status

**Symptoms**: Job shows `status: 'active'` but not progressing

**Diagnosis**:
```bash
# Check job status
curl http://localhost:4000/api/jobs/:jobId

# Check server logs for errors
npm run dev
# Look for: "Error processing job"
```

**Solution**:
```bash
# Cancel stuck job
curl -X POST http://localhost:4000/api/jobs/:jobId/cancel

# Or reset job in database
sqlite3 servers/friendly/data/niney.db
UPDATE jobs SET status = 'failed', error_message = 'Manually cancelled' WHERE id = 'job-uuid';
```

---

## 9. Emergency Procedures

### 9.1 Reset Everything

**When**: Nothing works, start fresh

```bash
# 1. Kill all processes
cd servers/friendly
npm run kill

# 2. Delete all data
rm -rf data/niney.db
rm -rf data/menu-images/*
rm -rf data/review-images/*

# 3. Delete node_modules
cd ../../
rm -rf apps/web/node_modules
rm -rf apps/mobile/node_modules
rm -rf apps/shared/node_modules
rm -rf servers/friendly/node_modules

# 4. Reinstall dependencies
cd apps/web && npm install
cd ../mobile && npm install
cd ../shared && npm install
cd ../../servers/friendly && npm install

# 5. Reset database
npm run db:reset

# 6. Restart servers
npm run dev
```

---

### 9.2 Database Corruption

**Symptoms**:
```
Error: database disk image is malformed
```

**Solution**:
```bash
# 1. Backup database
cp servers/friendly/data/niney.db servers/friendly/data/niney.db.backup

# 2. Try to recover
sqlite3 servers/friendly/data/niney.db
.mode insert
.output dump.sql
.dump
.exit

# 3. Recreate database
rm servers/friendly/data/niney.db
sqlite3 servers/friendly/data/niney.db < dump.sql

# 4. If recovery fails, reset database
npm run db:reset
```

---

### 9.3 Git Conflicts in Lock Files

**Symptoms**:
```
CONFLICT (content): Merge conflict in package-lock.json
```

**Solution**:
```bash
# 1. Accept one version
git checkout --theirs package-lock.json
# Or
git checkout --ours package-lock.json

# 2. Regenerate lock file
rm package-lock.json
npm install

# 3. Commit
git add package-lock.json
git commit -m "[fix] 패키지 락 파일 충돌 해결"
```

---

## 10. Getting Help

### 10.1 Logging Best Practices

```typescript
// Use structured logging
// servers/friendly/src/routes/*.ts
app.log.info({ userId, action: 'login' }, 'User logged in')
app.log.error({ error: err.message, stack: err.stack }, 'Login failed')

// Avoid console.log in production
// Use app.log (pino) for structured logs
```

---

### 10.2 Debugging Tools

**Backend**:
- **Fastify Logs**: `npm run dev` (pino pretty-print)
- **Database Browser**: [DB Browser for SQLite](https://sqlitebrowser.org/)
- **API Testing**: Swagger UI at `http://localhost:4000/docs`

**Frontend**:
- **React DevTools**: Browser extension
- **React Native Debugger**: Standalone app
- **Network Tab**: DevTools Network tab for API requests

**Socket.io**:
- **Admin UI**: https://socket.io/docs/v4/admin-ui/
- **Event Logging**: `socket.onAny((event, ...args) => console.log(event, args))`

---

### 10.3 When to Ask for Help

1. **Error persists after trying solutions above**
2. **Data loss risk** (database corruption, etc.)
3. **Security concern** (exposed credentials, etc.)
4. **Production outage**

**Include**:
- Exact error message
- Steps to reproduce
- Environment (OS, Node version, etc.)
- Relevant logs

---

## 11. Related Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow
- **[DATABASE.md](./DATABASE.md)** - Database schema and migrations
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance optimization
- **[FRIENDLY-AUTH.md](../04-friendly/FRIENDLY-AUTH.md)** - Authentication security
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture

---

**Maintained by**: Development Team
**Last Review**: 2025-10-24
**Feedback**: Create issue in GitHub repository
