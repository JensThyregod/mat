# UI Components & Design System

## Tech Stack
- **React 19**: Component architecture.
- **Framer Motion**: For all animations (page transitions, shared layout animations).
- **CSS Modules**: Scoped styling for components.
- **KaTeX**: Rendering mathematical equations.

## Design System
The application follows a modern "Glassmorphism" aesthetic.

### Global Variables
Defined in `src/index.css`.

- **Colors**:
  - `--primary`: Deep blue/purple brand color.
  - `--surface`: Glass-like background (white with transparency).
  - `--text-main`, `--text-muted`: Typography colors.
- **Spacing**: standard grid system.
- **Radius**: Large rounded corners (`20px+`).

## Animation Strategy
We use `framer-motion` extensively for a fluid feel.

### `PageTransition`
Wraps main views to fade/slide them in.

### `LayoutGroup`
We use Framer Motion's `LayoutGroup` to allow elements (like the Task Card opening into an Overlay) to animate seamlessly between states (Shared Element Transition).

