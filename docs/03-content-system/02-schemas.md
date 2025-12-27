# Schemas

This document details the YAML schemas used to define content.

## Task Type Schema
Used in `curriculum/task-types/*.yaml`.

```yaml
id: tal_broeker_og_antal          # Unique ID
name: Brøker og antal             # Display name
category: tal_og_algebra          # Major category
subcategory: broeker              # Minor category
level: fp9                        # Grade level
exam_part: uden_hjaelpemidler     # "med" or "uden" tools
difficulty: middel

description: |
  Long description for teachers/developers.

allowed_tools:
  calculator: false
  formula_sheet: false

# For LLM generation only (Logic generators ignore this)
variables:
  - name: total
    type: integer
    constraints:
      min: 20
      max: 50
```

## Task Instance Schema
Represents a single problem.

```yaml
id: tal_broeker_001
type: tal_broeker_og_antal
title: Enhedsomregning

intro: |
  Omregn 500 meter til kilometer.

figure: null  # or object (see below)

questions:
  - text: Hvor mange km?
    answer: "0,5"
    answer_type: number
    accept_alternatives: ["1/2"]
```

## Figure Types
The `figure` field supports various visualizers:

### Geometry
- **`triangle`**: Defined by vertices/angles.
- **`polygon`**: Coordinate-based shapes.
- **`intersecting_lines`**: For parallel line angle problems.

### Charts
- **`bar_chart`**: `data: { "Mon": 5, "Tue": 10 }`
- **`boxplot`**: Statistical 5-number summary.

### 3D
- **`voxel`**: 3D cube structures.

### Static
- **`svg`**: Raw SVG content.
- **`image`**: URL to an image.

