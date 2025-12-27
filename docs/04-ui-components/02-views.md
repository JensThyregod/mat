# Views

## `TasksView` (`src/views/TasksView.tsx`)
The main interface for students to browse and select assignments.

### Features
- **Grid Layout**: Responsive grid of `TaskCard`s.
- **Hero Header**: Animated stats (Total tasks, Completed).
- **Filtering**: (Planned) Filter by category.
- **Detail Overlay**: Clicking a card opens `TaskDetailOverlay` without leaving the route context (conceptually).

## `SkillTreeView` (`src/views/SkillTreeView.tsx`)
A visual map of the curriculum.

- **Graph Layout**: Uses `dagre` to calculate node positions automatically.
- **Interactivity**: Nodes can be clicked to practice specific skills.
- **Progress**: Nodes change color/style based on mastery.

## `DashboardView` (`src/views/DashboardView.tsx`)
The user's home page.
- **Welcome Message**: Personalized greeting.
- **Recent Activity**: Quick jump to last worked on tasks.
- **Progress Overview**: High-level charts/stats.

