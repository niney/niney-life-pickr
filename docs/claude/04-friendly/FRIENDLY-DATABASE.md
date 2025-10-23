# FRIENDLY-DATABASE.md

> **Last Updated**: 2025-10-23 23:30
> **Purpose**: SQLite database layer and migrations

---

## Quick Reference

**Database File**: `servers/friendly/data/niney.db`
**Connection Manager**: `src/db/database.ts`
**Migrations**: `src/db/migrations/*.sql`
**Migration Runner**: `src/db/migrate.ts`

---

## 1. Database Configuration

**Type**: SQLite3 (file-based)

**Connection Pool**: Single connection with `PRAGMA busy_timeout = 5000`

**Auto-Migration**: Runs on server startup

---

## 2. Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `sessions` | Session tokens (prepared for JWT) |
| `restaurants` | Restaurant metadata |
| `menus` | Menu items |
| `reviews` | Customer reviews |
| `review_summaries` | AI-generated summaries |
| `jobs` | Background task tracking |

**See**: [DATABASE.md](../00-core/DATABASE.md) for full schema

---

## 3. Migration System

**File Naming**: `001_initial.sql`, `002_add_jobs.sql`, etc.

**Migration Table**: `migrations` (tracks applied migrations)

**Process**:
1. Read all `.sql` files from `src/db/migrations/`
2. Check `migrations` table for applied versions
3. Execute pending migrations in order
4. Record each migration in `migrations` table

**Reset**: `npm run db:reset` (deletes `niney.db`, recreates on next start)

---

## 4. Timestamp Handling

**Important**: All dynamic timestamps use `datetime('now', 'localtime')`

**Why**: SQLite's `CURRENT_TIMESTAMP` returns UTC, causing discrepancies

**Modified Operations**:
- User login (`last_login` update)
- Restaurant UPSERT (`updated_at`)
- Review UPSERT (`updated_at`)
- Summary updates (`updated_at`)

**Schema Defaults**: `created_at` columns use `DEFAULT CURRENT_TIMESTAMP` (UTC) for consistency

---

## 5. Cascading Deletes

**ON DELETE CASCADE**:
- `menus.restaurant_id` → Deletes menus when restaurant deleted
- `reviews.restaurant_id` → Deletes reviews when restaurant deleted
- `review_summaries.review_id` → Deletes summaries when review deleted
- `jobs.restaurant_id` → Deletes jobs when restaurant deleted

---

**See Also**:
- [DATABASE.md](../00-core/DATABASE.md) - Full schema
- [FRIENDLY-REPOSITORIES.md](./FRIENDLY-REPOSITORIES.md) - Data access layer
- [FRIENDLY-OVERVIEW.md](./FRIENDLY-OVERVIEW.md) - Database integration
