# Availability Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-day manual-open overrides plus a quick-toggle calendar mode while preserving existing saved rule controls.

**Architecture:** Extend the availability rule model from a single manual-closed list to two explicit per-date override lists: `closedDates` and `openedDates`. The workbench computes final day state with `manual-open > manual-closed > automatic rules > default open`, and both modal actions and quick-toggle mode write only single-date overrides.

**Tech Stack:** TypeScript, Fastify, Prisma/SQLite, Vitest, Tabler UI

---

### Task 1: Lock Override Semantics With Tests

**Files:**
- Modify: `test/availability-workbench.test.ts`
- Modify: `src/routes/ui/availabilityWorkbench.ts`

- [ ] **Step 1: Write failing tests for three-state overrides and quick-toggle helpers**
- [ ] **Step 2: Run `npm test -- --run test/availability-workbench.test.ts` and verify failure**
- [ ] **Step 3: Implement minimal helper logic for override priority and toggle cycling**
- [ ] **Step 4: Re-run `npm test -- --run test/availability-workbench.test.ts` and verify pass**

### Task 2: Persist Manual-Open Overrides

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/schemas/admin.ts`
- Modify: `src/routes/admin/index.ts`
- Modify: `src/repositories/productRepository.ts`

- [ ] **Step 1: Write failing API/data tests or helper expectations for `openedDates` support**
- [ ] **Step 2: Extend schema and admin rule payloads to read/write `openedDates`**
- [ ] **Step 3: Keep backward compatibility for existing `closedDates` behavior**
- [ ] **Step 4: Run targeted tests and build**

### Task 3: Update Workbench Interaction Model

**Files:**
- Modify: `src/routes/ui/index.ts`
- Modify: `src/routes/ui/availabilityWorkbench.ts`

- [ ] **Step 1: Add quick-toggle switch and three-state per-day cycling**
- [ ] **Step 2: Update modal content/actions to support manual-open, manual-closed, and follow-rules**
- [ ] **Step 3: Ensure calendar rendering and summaries reflect opened-date overrides correctly**
- [ ] **Step 4: Run targeted tests and build**

### Task 4: Verify And Release

**Files:**
- Modify: none unless verification reveals issues

- [ ] **Step 1: Run `npm test -- --run test/availability-workbench.test.ts`**
- [ ] **Step 2: Run `npm run build`**
- [ ] **Step 3: Commit and push to `main`**
- [ ] **Step 4: Deploy on `/srv/gyg-calendar-bridge` with `git pull --ff-only origin main && docker compose up -d --build`**
