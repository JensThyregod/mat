# System Architecture

## Overview
This project is a modern single-page application (SPA) built for generating and serving mathematics tasks. It features a sophisticated task generation engine that runs entirely in the browser, supported by a curriculum-driven content system.

## Technology Stack
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript 5.9](https://www.typescriptlang.org/)
- **State Management**: [MobX 6.15](https://mobx.js.org/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Styling**: Standard CSS / CSS Modules
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Math Rendering**: [KaTeX](https://katex.org/)

## State Management
The application uses the **MobX** library for state management, following the "Root Store" pattern.

### The Root Store Pattern
The state is organized into a single tree rooted at `RootStore`.
- **`RootStore`**: Acts as the container for all domain stores. It allows stores to communicate with each other.
- **`AuthStore`**: Manages user session, login/logout, and profile data.
- **`TaskStore`**: Manages the loading, caching, and submission of tasks and answers.

The stores are provided to the component tree via a React Context (`StoreProvider`).

```typescript
// src/stores/storeProvider.tsx
export class RootStore {
  authStore: AuthStore
  taskStore: TaskStore

  constructor() {
    this.authStore = new AuthStore(this)
    this.taskStore = new TaskStore(this)
  }
}
```

### React Integration
Components access the store using the `useStore()` hook and are wrapped in `observer` to react to state changes.

```typescript
const MyComponent = observer(() => {
  const { taskStore } = useStore()
  return <div>{taskStore.loading ? 'Loading...' : 'Ready'}</div>
})
```

## Data Flow
The application currently runs with a **mock backend** (`src/services/mockApi.ts`), but the architecture is designed to support a real API.

1. **User Action**: A user interacts with a View (e.g., clicking "Start Task").
2. **Store Action**: The View calls a method on a Store (e.g., `taskStore.loadTasks()`).
3. **Service Call**: The Store calls the API service.
4. **State Update**: The Store updates its observable properties (e.g., `this.tasks = ...`).
5. **Re-render**: All `observer` components listening to that data automatically re-render.

## Key Subsystems
1. **Task Engine**: A standalone system for generating math problems algorithmically (`src/generators`).
2. **Expression Engine**: A custom math expression parser and evaluator (`src/utils/expression`).
3. **Curriculum System**: YAML-based definition of learning goals and progression (`curriculum/`).

