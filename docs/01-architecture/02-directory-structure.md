# Directory Structure

This document provides a map of the codebase to help you navigate.

## Root Directory
- `src/`: Application source code.
- `curriculum/`: YAML definitions for the math curriculum and task types.
- `backend/`: Data for the mock backend (user profiles, saved tasks).
- `docs/`: Project documentation.
- `playwright/`: E2E tests.

## Source Code (`src/`)

### Core Directories
- **`components/`**: Reusable UI components.
  - `animation/`: Framer Motion wrappers.
  - `equation/`: The math equation editor.
  - `...`: General UI components (Buttons, Cards, Inputs).
- **`generators/`**: The Task Generation Engine.
  - `logic/`: Algorithm-based generators (TS code).
  - `registry.ts`: Central registry for all generators.
  - `index.ts`: Public API for the generator system.
- **`stores/`**: MobX state containers.
  - `authStore.ts`: User authentication state.
  - `taskStore.ts`: Task management state.
  - `storeProvider.tsx`: React Context setup.
- **`views/`**: Top-level page components.
  - `DashboardView.tsx`: Main user landing page.
  - `SkillTreeView.tsx`: Visual progression map.
  - `TasksView.tsx`: Task solving interface.
  - `GeneratorTestView.tsx`: Developer tool for testing generators.
- **`utils/`**: Helper libraries.
  - `expression/`: Custom math expression parser/evaluator.
  - `voxel/`: 3D voxel rendering engine.
  - `answerChecker.ts`: Logic for validating user answers.
  - `latex*.ts`: Parsing and rendering LaTeX.
  - `geometry.ts`: Geometry calculations.

## Curriculum (`curriculum/`)
- `levels/`: Defines progression levels (e.g., `fp9`).
- `task-types/`: YAML files defining the configuration for each task type (e.g., `tal_broeker.yaml`).

## Backend (`backend/`)
- `data/`: JSON files acting as the database for the mock API.

