# Support Desk System

A lightweight, robust, editorial-styled Support Desk application built with a Node.js/Express/TypeScript layered backend and a modern React 18/TypeScript frontend.

---

## 1. Overview and Features

The Support Desk System provides end-to-end ticket lifecycle management for customer support teams:

- **Real-Time Dashboard**:
  - Live metric cards: **Total**, **Open**, **In Progress**, **Resolved**, **Urgent**, and **Overdue**.
  - Distinctive editorial hero layout featuring a decorative CSS-only diagonal slash.
  - Skeletons during loading and retryable error handling.

- **Ticket Queue & Filtering**:
  - High-density, plain, readable table displaying subject, customer, status pill, priority pill, assignee name, relative updated time, and a red `OVERDUE` badge for overdue tickets.
  - Combined toolbar filters: 300ms debounced search (matching `subject` or `customer`), Status filter, Priority filter, Assignee filter, and Sort options (`Recently Updated` or `Priority`).
  - Search and filter states are fully synchronised with the browser's URL query string for shareable, bookmarkable views.
  - Table rows are interactive and link directly to ticket detail views.

- **Create Ticket**:
  - Comprehensive form validating `subject`, `customer`, `description`, `priority`, `status`, and optional `assignee`.
  - Client-side validation on blur and submit with character counters.
  - Automatic mapping of server-side `400` field validation errors to corresponding form fields.
  - Anti-double-submit protection displaying an in-flight "Creating…" state.

- **Ticket Detail & Conversation Thread**:
  - Complete ticket metadata header with status, priority, creation timestamp, and last updated timestamp.
  - **Resolved Banner**: Prominent banner displayed when a ticket is resolved; automatically suppresses overdue tags.
  - **Sidebar Controls**: Real-time dropdowns for `Status`, `Priority`, and `Assignee` (including `Unassigned`) that trigger immediate `PATCH` updates with inline saving indicators and error handling.
  - **Edit Details Mode**: Inline editing of `subject`, `customer`, and `description` with validation and Save/Cancel.
  - **Conversation Thread**: Chronological merged stream of customer-visible public replies and private internal notes.
    - *Public reply*: Cream-colored card tagged `PUBLIC REPLY`.
    - *Internal note*: Amber-tinted card with a repeating -45° striped pattern, lock icon, and `INTERNAL NOTE - not visible to customer` tag.
    - Hovering over any relative timestamp reveals the exact date and time.
  - **Context-Aware Composer**: Two tabs (`Public reply` vs `Internal note`) that dynamically change the composer background color and button text (`Send reply` vs `Add internal note`) to prevent accidental public replies.
  - **Activity History**: Audit timeline rendering clear human-readable sentences for state transitions (e.g. *"Alice changed status from Open to In Progress"*, *"Carol assigned ticket to Bob Smith"*).

- **"Acting as" Agent Switcher**:
  - Persistent agent selector in the global header saved to `localStorage`, automatically attributing author and audit trail records across ticket writes, entries, and updates.

---

## 2. Tech Stack and Why

### Backend
- **Node.js & Express**: Industry-standard, lightweight HTTP runtime with minimal overhead and zero unnecessary abstractions.
- **TypeScript**: End-to-end type safety, strict compiler checks, and clean self-documenting interfaces.
- **SQLite via `better-sqlite3`**:
  - Synchronous, high-performance C-binding library with zero native event-loop lockups.
  - Eliminates the operational complexity of managing external database containers for local deployments and evaluation.
  - Enables true ACID transactions with `db.transaction()` and atomic event logging.
- **Zod**: Declarative schema validation ensuring all inputs are strictly typed, trimmed, and bounded before reaching business services.
- **Vitest & Supertest**: Fast, modern test runner with native TypeScript and ESM support executing HTTP assertions against ephemeral database instances.

### Frontend
- **React 18 & TypeScript**: Component-driven architecture using functional components and custom hooks (`useTickets`, `useTicketDetail`, `useDashboard`, `useAgents`).
- **Vite**: Rapid Hot Module Replacement (HMR) and optimized rollup production bundles.
- **React Router v6**: Client-side routing with clean nested layouts and URL query parameter management.
- **Plain CSS with CSS Variables**: Custom design tokens without bloated UI libraries. Features Google Fonts (*Anton* for bold editorial headings/stat numerals and *Inter* for crisp typography).

---

## 3. Prerequisites

- **Node.js**: `v18.0.0` or higher (tested and verified on `v22.18.0 LTS`).
- **npm**: `v9.0.0` or higher (tested with `10.9.3`).

No external database services (PostgreSQL, MySQL, Docker) are required.

---

## 4. Setup & Run

### 1. Install Dependencies

Open two terminal sessions or run sequentially:

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 2. Seed the Database

Populate the database with demo agents and ~10 realistic support tickets (including backdated overdue tickets and an old resolved ticket):

```bash
cd server
npm run seed
```

### 3. Start the Development Servers

```bash
# Terminal 1: Backend API (runs on http://localhost:3001)
cd server
npm run dev

# Terminal 2: Frontend Client (runs on http://localhost:5173)
cd client
npm run dev
```

Visit **`http://localhost:5173`** in your browser. All API calls (`/api/*`) are automatically proxied to port `3001` with zero CORS friction.

### Environment Variables

**No `.env` file is required.** The application works out-of-the-box with sensible defaults:
- `PORT`: Server port (default: `3001`). Can be overridden if needed: `PORT=4000 npm run dev`.

---

## 5. Database

- **File Location**: `server/data/support-desk.db` (created automatically on server startup or seed).
- **Schema Location**: [`server/src/db/schema.sql`](file:///server/src/db/schema.sql).
- **Initialization**:
  - `initDb()` in [`server/src/db/connection.ts`](file:///server/src/db/connection.ts) enables WAL journal mode (`PRAGMA journal_mode = WAL;`) and activates foreign keys (`PRAGMA foreign_keys = ON;`).
  - Executes `schema.sql` automatically using `CREATE TABLE IF NOT EXISTS`.
  - Automatically seeds the 3 default demo agents (`Alice Johnson`, `Bob Smith`, `Carol Williams`) if not present.
- **How to Reset**:
  - Run `npm run seed` inside `/server` anytime. It clears tickets, entries, and events in a single transaction, resets ID sequences, and repopulates fresh sample data while preserving agent records.
  - Alternatively, delete `server/data/support-desk.db` and restart the server.

---

## 6. API Reference

All endpoints return JSON and use standard HTTP status codes:

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Service health check | `200` |
| `GET` | `/api/agents` | List all available support agents | `200` |
| `GET` | `/api/agents/:id` | Get single agent by ID | `200`, `400`, `404` |
| `GET` | `/api/dashboard` | Aggregated metrics (total, open, inProgress, resolved, urgent, overdue) | `200` |
| `GET` | `/api/tickets` | Query tickets (supports `search`, `status`, `priority`, `assignee`, `sort`) | `200` |
| `POST` | `/api/tickets` | Create a new ticket (validates subject, customer, description, priority, assignee) | `201`, `400` |
| `GET` | `/api/tickets/:id` | Get single ticket with nested `entries` and audit `events` | `200`, `400`, `404` |
| `PATCH` | `/api/tickets/:id` | Update ticket fields (`?actor=Name` captures audit trail) | `200`, `400`, `404` |
| `POST` | `/api/tickets/:id/entries` | Add a public `reply` or private `note` to ticket thread | `201`, `400`, `404` |
| `GET` | `/api/tickets/:id/events` | Retrieve chronological audit event history for ticket | `200`, `400`, `404` |

---

## 7. Architecture

### Folder Layout

```
.
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── data/
│   │   └── support-desk.db            # SQLite database file
│   ├── src/
│   │   ├── index.ts                   # Server entrypoint (listens on :3001)
│   │   ├── app.ts                     # Express application factory
│   │   ├── db/
│   │   │   ├── schema.sql             # SQL DDL schemas & constraints
│   │   │   ├── connection.ts          # Database instance management
│   │   │   └── seed.ts                # Idempotent seed script
│   │   ├── middleware/
│   │   │   └── errorHandler.ts        # Central error handler (Zod -> 400, AppError -> N, else 500)
│   │   ├── validators/
│   │   │   └── ticket.ts              # Zod validation schemas
│   │   ├── services/
│   │   │   ├── agentService.ts        # Agent data queries
│   │   │   ├── ticketService.ts       # Core ticket business logic & transactions
│   │   │   └── dashboardService.ts    # Single-query dashboard metrics aggregation
│   │   └── routes/
│   │       ├── agents.ts              # Agent endpoints
│   │       ├── tickets.ts             # Ticket CRUD endpoints
│   │       └── dashboard.ts          # Dashboard stats endpoint
│   └── tests/
│       └── tickets.test.ts            # Integration test suite (16 tests)
└── client/
    ├── package.json
    ├── vite.config.ts                 # Dev proxy configuration (/api -> :3001)
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── App.tsx                    # Routes & layout shell
        ├── main.tsx                   # React root entry
        ├── api/client.ts              # Typed fetch client with ApiError
        ├── utils/dates.ts             # SQLite UTC date parser & relative time formatter
        ├── hooks/                     # Custom React query/mutation hooks
        ├── components/                # Modular UI components (badges, cards, composer, thread)
        ├── pages/                     # Dashboard, TicketList, CreateTicket, TicketDetail
        └── styles/                    # Design tokens & CSS stylesheets
```

### Layered Structure: `routes -> services -> db`

- **Routes**: Thin HTTP controllers responsible solely for receiving requests, invoking Zod validation schemas, delegating work to services, and setting appropriate HTTP status codes. No business rules reside in route handlers.
- **Services**: Contain all domain logic, transaction coordination, and event dispatching.
- **DB Layer**: Direct, parameterized SQL queries executed via prepared statements using `better-sqlite3`.

### Key Design Decisions
- **Express App Separation (`app.ts` vs `index.ts`)**: The Express application factory in `app.ts` is decoupled from network port binding in `index.ts`, allowing Supertest to spin up isolated test instances without port collisions.
- **Centralized Error Handling**: Any exception thrown anywhere in the service layer is caught by `middleware/errorHandler.ts`. Zod errors are transformed into `{ error: "Validation failed", details: [{ field, message }] }`, returning `400`. Known operational errors use `AppError(status, message)`.
- **Database Atomicity**: Mutating operations (e.g. updating a ticket's status, changing assignee, or adding an entry) perform both the record modification and the event creation in the **exact same SQLite transaction**. If any step fails, the entire transaction rolls back.

---

## 8. Business Rules and Assumptions

1. **Overdue Status Computed on Query (Never Stored)**:
   - A ticket is overdue if and only if: `status != 'Resolved' AND created_at <= datetime('now', '-24 hours')`.
   - Overdue status is computed dynamically in SQL on every query as a boolean expression (`isOverdue: boolean`). Storing a static boolean would result in stale data.
2. **Resolved Exclusion in Metrics**:
   - Urgent tickets and Overdue tickets counted on the dashboard strictly exclude tickets where `status == 'Resolved'`.
3. **No DELETE Endpoints**:
   - Support tickets represent immutable audit and compliance history for customer interactions. Tickets can be transitioned to `Resolved`, but cannot be deleted via the API.
4. **Cascade Foreign Keys**:
   - Schema defines `PRAGMA foreign_keys = ON;` and `ON DELETE CASCADE` on `ticket_entries` and `ticket_events` referencing `tickets(id)`, ensuring child records remain consistent.
5. **UTC Timestamps**:
   - All database timestamps are generated using SQLite's `datetime('now')` in UTC format (`YYYY-MM-DD HH:MM:SS`). The client normalises these strings using `parseUtc()` to ensure accurate relative time across all timezones.
6. **"Acting As" Agent is a Demo Identity, Not Authentication**:
   - The "Acting as" selector in the header is a convenience feature for local evaluation and testing. It stores the active agent in `localStorage` and supplies their name as `author` or query parameter `?actor=Name`. It is **not** an authentication or authorization mechanism.

---

## 9. What Works / What's Incomplete / Known Issues

### What Works
- Full CRUD lifecycle (create ticket, edit details, transition status/priority/assignee).
- Conversation thread with clear public replies vs. striped internal notes.
- Context-switching composer with tabbed UI and safety controls.
- Audit history logging for every creation, update, assignee switch, and entry.
- Real-time dashboard with SQL aggregation.
- Responsive table with combined URL-synced filters and debounced search.
- 100% passing test suite covering business rules, overdue calculations, and validations.

### What's Incomplete / Real Gaps
- **Authentication & RBAC**: There is no JWT, session, or password authentication. Any client can pass any `actor` name or ID.
- **Pagination**: The ticket list endpoint returns all matching rows without `LIMIT` / `OFFSET` pagination. While fast for hundreds of tickets in SQLite, thousands of tickets will require pagination.
- **File Attachments**: Ticket entries currently only support plain text; no binary attachments or S3/disk file upload pipelines exist.
- **Outbound Notifications**: No email integration (SMTP/Sendgrid) or webhook triggers to alert customers or agents when replies are posted.
- **Real-Time WebSockets**: Updates rely on standard HTTP request/response and refetching on user actions rather than server-sent events (SSE) or WebSockets.
- **Search Mechanism**: Ticket search uses SQL `LIKE %term%` on subject and customer. For enterprise datasets, SQLite FTS5 full-text indexing should replace `LIKE`.

---

## 10. How AI Tools Were Used

This project was built pair-programming with **Antigravity** (Google DeepMind):
- **Scaffolding & Architecture**: Antigravity generated the initial layered backend architecture (`routes -> services -> db`), SQL schema constraints, and React component hierarchy.
- **Review & Verification**: Every component, SQL query, Zod schema, and edge case was reviewed, executed, and validated in an isolated sandbox.
- **Verification of Rules**: Explicit tests were run to ensure edge cases (e.g. 24h overdue boundaries and exclusion of resolved tickets from urgent counts) behaved according to specifications.
- **Code Ownership**: All files, architectural decisions, and design choices are documented, reproducible, and explainable.

---

## 11. Testing

The test suite is written using **Vitest** and **Supertest** in [`server/tests/tickets.test.ts`](file:///server/tests/tickets.test.ts).

### Test Coverage
- **Validation (400)**: Rejection of missing required fields (`subject`, `customer`, `description`), whitespace-only inputs, and strings exceeding max length.
- **Event Audit Creation**: Verification that creating tickets, modifying status, changing priority, assigning agents, and posting replies write corresponding `ticket_events` rows within the same transaction.
- **Overdue Rule Calculation**:
  - Direct database insertion of tickets backdated 25+ hours confirms `isOverdue === true`.
  - Fresh tickets confirm `isOverdue === false`.
- **Dashboard Resolved Exclusion**:
  - Urgent tickets marked `Resolved` are excluded from the `urgent` metric.
  - Old tickets marked `Resolved` are excluded from the `overdue` metric.
- **Error Handling (404)**: Accessing or updating non-existent IDs returns structured `404 Not Found`.
- **Search, Filter & Priority Ranking**: Verification of LIKE search, combined filtering, and priority sort ordering (`Urgent -> High -> Medium -> Low`).

### Running Tests

```bash
cd server
npm test
```

Expected output:
```text
 ✓ tests/tickets.test.ts (16 tests)
 Test Files  1 passed (1)
      Tests  16 passed (16)
```

