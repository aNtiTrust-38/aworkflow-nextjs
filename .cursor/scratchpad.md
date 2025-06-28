# Academic Workflow Project Planner Documentation

## Background and Motivation
This project aims to automate and streamline the academic paper writing process through a six-stage workflow, leveraging AI, citation network analysis, and multi-source research. The goal is to reduce manual effort, improve research quality, and maintain academic rigor, all within a cost-effective, single-user, local deployment environment.

## Key Challenges and Analysis
- Integrating multiple AI providers (Claude, GPT-4o) with cost tracking and smart model selection
- Multi-source research aggregation (Semantic Scholar, CrossRef, ArXiv, Google Scholar)
- Local-first, secure deployment with Docker and Cloudflare Tunnel
- File and reference management (PDFs, screenshots, Zotero)
- Responsive, accessible UI for each workflow stage
- Comprehensive TDD coverage (unit, integration, e2e)

## High-level Task Breakdown (Phase 1: Foundation)
- [ ] Design Next.js 14 (App Router) project structure with TypeScript and Tailwind
  - Success: Project builds and runs, directory structure matches spec
- [ ] Define initial Prisma schema for user, paper, reference, and file entities
  - Success: Prisma migration runs, tables created, types generated
- [ ] Set up NextAuth.js for local session authentication
  - Success: User can log in/out locally, session persists
- [ ] Configure Docker and docker-compose for app and PostgreSQL
  - Success: `docker-compose up` starts app and db, app accessible at localhost:3000
- [ ] Establish basic API route scaffolding for each workflow stage
  - Success: API endpoints return 200 OK with placeholder data
- [ ] Set up Vitest, Playwright, and React Testing Library
  - Success: Example test runs and passes, test scripts in package.json

## Project Status Board
- [x] Foundation: Project structure, DB, Auth, Docker, Test setup
  - [x] Next.js 14 project scaffolded with TypeScript, Tailwind CSS, ESLint, App Router, and src directory
  - [x] Project builds and runs (`npm run dev` successful, accessible at http://localhost:3000)
- [x] Define initial Prisma schema for user, paper, reference, and file entities
  - [x] Prisma schema created and migrated (sqlite for local dev)
  - [x] Types generated and imported in test
  - [x] TDD test for type existence passes
- [x] Set up NextAuth.js for local session authentication
  - [x] NextAuth.js installed and configured with credentials provider
  - [x] Sign-in page created
  - [x] SessionProvider added to app
  - [x] Integration test for login/logout passes
- [ ] Configure Docker and docker-compose for app and PostgreSQL
- [ ] Establish basic API route scaffolding for each workflow stage
- [ ] Set up Vitest, Playwright, and React Testing Library

## Executor's Feedback or Assistance Requests
- NextAuth.js local session authentication is implemented and tested (TDD: integration test passes).
- Project is ready for next foundation task (e.g., Docker config or API scaffolding).

_Executor: Awaiting Planner/PM review or next task assignment._

## Lessons
- Add info useful for debugging in program output
- Read files before editing
- Run npm audit if vulnerabilities appear
- Ask before using --force with git

## Database Schema Design (Phase 1)
- **User**: id, name, email, password (hashed), createdAt, updatedAt
- **Paper**: id, userId (FK), title, outline, content, status, createdAt, updatedAt
- **Reference**: id, paperId (FK), title, authors, source, url, citation, addedAt
- **File**: id, paperId (FK), userId (FK), filename, type, path, uploadedAt

_Success Criteria: Prisma schema defined, migration runs, types generated._

## Initial API Contracts (Phase 1)
- `POST /api/outline` — Generate outline from prompt and files
  - Input: { prompt, rubric?, samplePapers?, sampleOutline? }
  - Output: { outline, status }
- `GET /api/health` — Health check
  - Output: { status: 'ok' }
- `POST /api/upload` — Upload files
  - Input: multipart/form-data
  - Output: { fileId, url }

_Success Criteria: Endpoints return 200 OK with placeholder data._

## Test Scenarios (Phase 1)
- **Project Structure**: Directory and file structure matches spec, project builds and runs
- **Prisma Schema**: Migration creates tables, types are correct
- **Auth**: User can register, login, logout (local session)
- **API Routes**: Endpoints respond with correct status and shape
- **Docker**: `docker-compose up` starts app and db, app accessible at localhost:3000
- **Testing Setup**: Example Vitest, Playwright, and RTL tests pass

---

### First Task for Executor

**Task:**
Set up the Next.js 14 project with TypeScript, Tailwind CSS, and the specified directory structure. Ensure the project builds and runs, and the structure matches the provided spec.

**Success Criteria:**
- Project builds and runs (`npm run dev`)
- Directory structure matches the project spec
- TypeScript and Tailwind CSS are configured
- Initial commit includes README and .scratchpad.md

_Executor: Please update the Project Status Board and provide feedback after completing this task._

---

### Next Task: Define Initial Prisma Schema (Concise Summary)

- **Goal:** Create `prisma/schema.prisma` with User, Paper, Reference, and File models.
- **Success Criteria:**
  - Models match project requirements (relations, fields, types)
  - `npx prisma migrate dev` runs without error
  - Types generated and available in the project
- **Test Scenario:**
  - Migration creates tables in local database
  - Can generate and use types in TypeScript code

_Executor: Proceed to implement this task and update the Project Status Board upon completion._

---

### Next Task: Set Up NextAuth.js for Local Session Authentication (Concise Summary)

- **Goal:** Integrate NextAuth.js for local session-based authentication.
- **Steps:**
  1. Install NextAuth.js and required dependencies.
  2. Create `/pages/api/auth/[...nextauth].ts` with credentials provider (local only).
  3. Add basic sign-in/sign-out UI (can be placeholder for now).
  4. Configure session persistence and secure cookie settings for local dev.
- **Success Criteria:**
  - User can register (if enabled), log in, and log out locally.
  - Session persists across reloads.
  - Auth state accessible in React components.
- **Test Scenario:**
  - Integration test: Simulate login/logout, check session state and protected route access.

_Executor: Proceed to implement and test this task. Update the Project Status Board and provide feedback upon completion._ 