# Core Components

## `TaskContent` (`src/components/TaskContent.tsx`)
This is the most critical component for the learning experience. It renders the actual math problem.

### Responsibilities
1. **Layout**: Arranges Intro, Figure, and Questions.
2. **Rendering**:
   - `ParsedTask`: Converts the internal task structure to UI.
   - `dangerouslySetInnerHTML`: Used for pre-rendered LaTeX HTML.
3. **Figures**: Delegates to `FigureRenderer` (handles SVG, Voxel, Image).
4. **Inputs**: Renders the correct input type (Text, FractionInput, MultipleChoice).
5. **Validation**: Shows correct/incorrect state with animations.

## `EquationEditor` (`src/components/equation/EquationEditor.tsx`)
A specialized component for the "Ligninger" (Equations) trainer.

- **Interaction**: Users click/hover terms to apply operations.
- **Visuals**: Two sides of the equation, equal sign in middle.
- **State**: Tracks the current expression structure.

## `TaskCard` (`src/components/TaskCard.tsx`)
Displays a summary of a task in the list view.

- **Props**: `Task` object, `progress` (answered/total).
- **Visuals**: Title, Category icon, Progress bar/ring.

