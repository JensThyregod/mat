# Testing Guide

We use a combination of Unit Tests and End-to-End (E2E) tests.

## Unit Tests (Vitest)
Used for testing logic, stores, and individual components.

- **Run all tests**: `npm run test`
- **Run with UI**: `npm run test -- --ui`
- **Coverage**: `npm run test:coverage`

Key directories:
- `src/__tests__/`: Integration tests for key flows.
- `src/**/*.test.ts`: Co-located tests.

## E2E Tests (Playwright)
Used for testing the full application flow (Login -> Dashboard -> Solve Task).

Located in `playwright/`.

- **Run tests**:
  ```bash
  cd playwright
  npx playwright test
  ```
- **Show report**: `npx playwright show-report`

### Writing E2E Tests
See `playwright/tests/auth.spec.ts` for examples of how to log in and interact with the page.

