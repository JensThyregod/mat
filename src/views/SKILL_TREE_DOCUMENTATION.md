# Skill Tree Implementation

## Overview

The Skill Tree is a video game-inspired visualization of a student's mathematical skill progression. It displays a Directed Acyclic Graph (DAG) of mathematical concepts, showing dependencies between skills and the student's progress through them.

## Architecture

### Core Components

```
src/views/
├── SkillTreeView.tsx    # Main component with data and rendering logic
├── SkillTreeView.css    # Styling with warm, elegant theme
└── SKILL_TREE_DOCUMENTATION.md  # This file
```

### Data Structures

#### Skill Interface
```typescript
interface Skill {
  id: string                                    // Unique identifier
  name: string                                  // Display name
  description: string                           // Detailed description
  level: string                                 // School level, e.g., "Indskoling · 1. kl."
  category: 'tal' | 'geometri' | 'statistik'   // Subject category
  x: number                                     // Hint for horizontal position
  y: number                                     // Hint for vertical position (rank)
  prerequisites: string[]                       // IDs of required skills
  status: 'locked' | 'available' | 'unlocked' | 'mastered'
  xp?: number                                   // Progress percentage (0-100)
  icon: string                                  // Emoji icon
}
```

#### Skill Statuses
| Status | Description | Visual |
|--------|-------------|--------|
| `mastered` | Fully completed | Solid color, checkmark, full XP ring |
| `unlocked` | In progress | Colored, partial XP ring |
| `available` | Ready to start | Colored outline, no XP |
| `locked` | Prerequisites not met | Grayed out, lock icon |

### Connections
Connections are defined separately from skills to allow for multiple parents:
```typescript
const connections: { from: string; to: string }[] = [
  { from: 'start', to: 'addsub' },
  { from: 'frac', to: 'prob' },
  { from: 'pct', to: 'prob' },  // prob has 2 parents
  // ...
]
```

## Layout Algorithm

### Dagre Integration

We use [dagre](https://github.com/dagrejs/dagre) for automatic graph layout. Dagre implements the Sugiyama algorithm which:

1. **Assigns ranks** - Places nodes in horizontal layers based on dependencies
2. **Orders nodes** - Minimizes edge crossings within each layer
3. **Positions nodes** - Calculates optimal x,y coordinates
4. **Routes edges** - Provides waypoints for edges that avoid nodes

### Configuration
```typescript
const PADDING = 60          // Margin around the graph
const LABEL_WIDTH = 100     // Space for zone labels
const NODE_WIDTH = 80       // Node width for dagre
const NODE_HEIGHT = 90      // Node height for dagre
const RANK_SEP = 80         // Vertical spacing between ranks
const NODE_SEP = 50         // Horizontal spacing between nodes
const ZONE_PADDING = 40     // Padding around nodes within zones
```

### School Level Zones

Nodes are grouped into three school levels based on Danish curriculum:

| Zone | Grades | Color |
|------|--------|-------|
| Indskoling | 1.-3. klasse | Purple (Indigo) |
| Mellemtrin | 4.-6. klasse | Green (Emerald) |
| Udskoling | 7.-9. klasse | Orange (Amber) |

The implementation:
1. Groups nodes by their `level` property
2. Calculates Y ranges for each zone with gaps between them
3. Repositions nodes to ensure proper zone containment
4. Draws zone backgrounds with dashed separator lines

### Edge Routing

Edges use dagre's calculated waypoints to avoid crossing through nodes:

```typescript
// Get edge route from dagre
const routeKey = `${conn.from}->${conn.to}`
const points = edgeRoutes[routeKey]

// Create smooth bezier curve through waypoints
if (points.length === 2) {
  // Simple curved line
  path = `M ${p0} C ${control1}, ${control2}, ${p1}`
} else {
  // Smooth curve through multiple points using Q and T commands
  path = `M ${p0} Q ${p1} T ${p2} T ${p3}...`
}
```

## Visual Design

### Theme
The skill tree follows the application's warm, elegant theme:
- **Background**: Warm cream (`#FFFDF9`)
- **Text**: Dark stone colors (`#1C1917`, `#57534E`)
- **Borders**: Soft stone (`#E7E5E4`)

### Category Colors
Each mathematical category has a distinct color:
- **Tal** (Numbers): Indigo (`#6366F1`)
- **Geometri** (Geometry): Emerald (`#10B981`)
- **Statistik** (Statistics): Amber (`#F59E0B`)

### Node Rendering
Nodes are rendered as SVG groups with:
1. **Hit area** - Larger transparent circle for easier interaction
2. **Background circle** - White fill with colored stroke
3. **XP progress ring** - Shows completion percentage
4. **Decorative rings** - Animated pulse effect for active skills
5. **Icon** - Emoji centered in the node
6. **Label** - Skill name below the node
7. **Lock overlay** - For locked skills

### Connection Rendering
Connections feature:
- **Solid lines** for active paths (unlocked → available/unlocked/mastered)
- **Dashed lines** for locked paths
- **Glow effect** on active connections
- **Animated particles** flowing along active connections

## Interactivity

### Node Selection
Clicking a node opens a detail panel showing:
- Skill name and description
- School level
- XP progress bar (for non-locked skills)
- Prerequisites list with status
- Action button based on skill status

### Unlock Requirements
For locked skills, the panel shows:
- Which prerequisites need to be mastered
- Progress bar for prerequisite completion
- Clickable prerequisite nodes for navigation

## DAG Structure

The skill tree represents the Danish math curriculum with approximately 37 skills across three categories:

### Core Number Path (Tal)
```
start → addsub → mul → div → frac → dec → place → pct → ratio → prop → alg → eq → func/sys
```

### Geometry Branch (Geometri)
```
start → shapes2d → measure → peri → area → volume → pyth
                          ↘ angles → lines → construct
                                         ↘ coord → scale → similar → trig
```

### Statistics Branch (Statistik)
```
start → data → charts → avg → medmode
                    ↘ prob → comb → comp → unc
```

### Cross-Category Dependencies
Several skills have multiple prerequisites from different categories:
- `prob` ← `frac` + `pct`
- `scale` ← `ratio` + `coord`
- `similar` ← `scale` + `angles`
- `func` ← `eq` + `coord`
- `trig` ← `similar` + `pyth`
- `comp` ← `comb` + `mul`

## Performance Considerations

1. **useMemo for layout** - Dagre layout is calculated once and memoized
2. **useCallback for renderers** - Node and connection render functions are memoized
3. **CSS-only hover effects** - No React state changes on hover
4. **SVG rendering** - Efficient vector graphics, no canvas

## Future Improvements

Potential enhancements:
- [ ] Persist skill progress to backend
- [ ] Connect skills to actual task completion
- [ ] Add skill unlock animations
- [ ] Implement zoom/pan for mobile
- [ ] Add skill tree branches for different curriculum tracks
- [ ] Show recommended next skills based on progress

## Dependencies

```json
{
  "dagre": "^0.8.5",
  "@types/dagre": "^0.7.52"
}
```

## Usage

```tsx
import { SkillTreeView } from './views/SkillTreeView'

// In your router or component:
<Route path="/skill-tree" element={<SkillTreeView />} />
```

The skill tree is accessible via the "🎮 Skill Tree" tab in the navigation.

