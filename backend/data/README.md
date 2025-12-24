# Task Catalog System

This project uses a YAML-based task catalog for math exercises. Tasks are stored as individual YAML files that can be reused across students and sessions.

## Directory Structure

```
curriculum/                          # Schema definitions
  task-types/                        # Task type definitions
    tal_broeker_og_antal.yaml        # "Brøker og antal" task template
    tal_ligninger.yaml               # "Ligninger" task template
    geo_vinkelsum.yaml               # "Vinkelsum" task template
    ...
  levels/                            # Level-specific metadata
    fp9/
      meta.yaml                      # FP9 exam structure, timing, rules

tasks/                               # Task catalog (instances)
  tal_broeker_001.yaml              # {type}_{instance}.yaml
  tal_broeker_002.yaml
  geo_vinkelsum_001.yaml
  ...

backend/data/users/<user-id>/        # User-specific data
  profile.json                       # Student profile (id/name/code)
```

## YAML Task Format

### Task Type Definition (`curriculum/task-types/`)

Defines the schema/template for a type of task:

```yaml
id: tal_broeker_og_antal
name: Brøker og antal
category: tal_og_algebra
subcategory: broeker
level: fp9
exam_part: uden_hjaelpemidler
difficulty: middel

description: |
  Opgaver hvor eleven arbejder med brøker i hverdagskontekst.
  Et totalantal er givet, og eleven beregner andele.

allowed_tools:
  calculator: false
  formula_sheet: false

figure_type: none

variables:
  - name: taeller
    type: integer
    constraints: { min: 1, max: 9 }
  - name: naevner
    type: integer
    constraints:
      options: [2, 3, 4, 5, 6, 8, 10, 12, 18]
  - name: total
    type: integer
    constraints: { min: 20, max: 50 }

question_patterns:
  - Beregn brøkdel × total
  - Beregn komplementær brøkdel

official_examples:
  - exam: FP9
    year: 2022
    month: maj
    task_number: 4
```

### Task Instance (`tasks/`)

An individual task with specific values:

```yaml
id: tal_broeker_001
type: tal_broeker_og_antal
title: "Opgave 1: Brøker og antal"

intro: |
  I en klasse er \(\tfrac{7}{18}\) af eleverne 16 år.
  Der er 36 elever i klassen.

figure: null

questions:
  - text: Hvor stor en brøkdel af eleverne er ikke 16 år?
    answer: "11/18"
    answer_type: fraction
  - text: Hvor mange af eleverne er 16 år?
    answer: "14"
    answer_type: number

variables:
  taeller: 7
  naevner: 18
  total: 36
  kontekst: klasse
  egenskab: "er 16 år"

source:
  exam: FP9
  year: 2022
  month: maj
  task_number: 4
```

## Figure Types

Figures are defined as structured YAML objects:

### Triangle
```yaml
figure:
  type: triangle
  vertices:
    A: { angle: 65 }
    B: { angle: 45 }
    C: { angle: "?" }
```

### Polygon
```yaml
figure:
  type: polygon
  vertices:
    A: [0, 0]
    B: [4, 0]
    C: [4, 3]
    D: [0, 3]
  sides:
    AB: "2a"
    BC: "3"
  right_angles: ["A", "B", "C", "D"]
  show_angles: false
  show_labels: true
```

### 3D Voxel Projections
```yaml
figure:
  type: voxel
  difficulty: medium  # easy|medium|hard
```

Generates procedurally:
- easy: 4 cubes, 3 options (A-C)
- medium: 7 cubes, 4 options (A-D)
- hard: 10 cubes, 5 options (A-E)

### Bar Chart
```yaml
figure:
  type: bar_chart
  data:
    Januar: 3
    Februar: 5
    Marts: 2
```

### Boxplot
```yaml
figure:
  type: boxplot
  data:
    A:
      min: 145
      q1: 155
      median: 162
      q3: 170
      max: 182
```

## Question Format

Each question has:
- `text`: Question text (can contain LaTeX math)
- `answer`: Correct answer as string
- `answer_type`: One of `number`, `fraction`, `percent`, `text`, `multiple_choice`, `expression`, `unit`
- `accept_alternatives`: Optional array of alternative correct answers

### LaTeX in Questions

Use standard LaTeX math delimiters:
- `\(...\)` for inline math
- `\[...\]` for display math
- `$...$` for inline (alternative)

## Naming Convention

Task files follow the pattern: `{type}_{instance}.yaml`

- Type ID is extracted from filename for grouping
- Instance number (zero-padded) ensures uniqueness
- Example: `tal_broeker_001.yaml`, `tal_broeker_002.yaml`

## Answer Types

| Type | Example | Description |
|------|---------|-------------|
| `number` | 42, 3.14 | Numeric answer |
| `fraction` | 7/18, 1/3 | Fraction (unreduced or reduced) |
| `percent` | 25, 25% | Percentage |
| `text` | marts, Marts | Free text |
| `multiple_choice` | A, B, C | Letter choice |
| `expression` | 2a, a² | Algebraic expression |
| `unit` | 3,5 cm | Number with unit |

## Categories

- `tal_og_algebra` - Numbers and algebra
- `geometri_og_maaling` - Geometry and measurement
- `statistik_og_sandsynlighed` - Statistics and probability

## Difficulty Levels

- `let` - Easy (basic operations, simple reading)
- `middel` - Medium (multi-step, requires understanding)
- `svaer` - Hard (complex reasoning, multiple concepts)

## Migration from .tex

The old `.tex` format has been replaced by YAML. Benefits:
- No regex parsing required
- Structured data directly usable
- Type-safe with TypeScript interfaces
- AI-friendly for task generation
- Reusable task catalog
