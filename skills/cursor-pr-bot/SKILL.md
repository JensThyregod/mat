---
name: cursor-pr-bot
description: Use Cursor CLI to add/fix tests and code, then open a GitHub PR.
metadata:
  openclaw:
    requires:
      - bin: cursor
      - bin: gh
      - bin: git
---

## Goal
Make small, safe improvements:
1) create a new branch
2) use Cursor CLI to add/fix tests and implement the change
3) run tests
4) commit
5) push the branch and create a PR via `gh`

## Input
This skill expects a **topic** (short description of what to change) and an **area** (which part of the codebase to target, e.g. `frontend/src/generators`).

## Operating rules
- Keep changes minimal and reviewable.
- Never push directly to main.
- Stop and report if tests fail after the change.
- If anything fails, check out main and delete the local branch before stopping.

## Steps (run every command from the repo root)

### 1) Pre-flight checks
```bash
# Abort if working tree is dirty
git diff --quiet && git diff --cached --quiet || { echo "ERROR: working tree is not clean"; exit 1; }

# Verify gh is authenticated
gh auth status || { echo "ERROR: gh is not authenticated — run 'gh auth login' first"; exit 1; }
```

### 2) Create branch
```bash
BRANCH="openclaw/<short-topic>-$(date +%Y%m%d-%H%M)"
git checkout -b "$BRANCH"
```

### 3) Ask Cursor to do the work
```bash
cursor --command "Add/strengthen unit/integration tests for <area>. Fix any failing tests. Do not change unrelated files. Explain what you changed."
```

### 4) Run tests
Frontend unit tests (vitest):
```bash
cd frontend && npx vitest run && cd ..
```
Backend tests (.NET):
```bash
cd backend && dotnet test && cd ..
```
If any test command fails, stop and report the failure.

### 5) Commit
```bash
git add -A
git commit -m "test: improve coverage for <area>"
```

### 6) Push and create PR
```bash
git push -u origin "$BRANCH"

gh pr create \
  --title "<title>" \
  --body "## What changed
- <summary of changes>

## How to run tests
- Frontend: \`cd frontend && npx vitest run\`
- Backend: \`cd backend && dotnet test\`

## Test results
- <paste test output summary>"
```

## Rollback (on failure)
```bash
git checkout main
git branch -D "$BRANCH"
```