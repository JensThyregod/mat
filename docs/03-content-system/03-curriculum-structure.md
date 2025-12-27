# Curriculum Structure

The curriculum defines the learning path and exam constraints.

## Levels
A **Level** corresponds to a grade or exam standard (e.g., "FP9" for Folkeskolens Prøver 9. klasse).

Defined in `curriculum/levels/{level_id}/meta.yaml`:

```yaml
id: fp9
name: Folkeskolens Prøver 9. klasse
exam_parts:
  - id: uden_hjaelpemidler
    duration_minutes: 60
    task_count: 20
    allowed_tools:
      calculator: false
      # ...
```

## Categories
Tasks are organized into three main subject areas (competence areas):

1. **Tal og Algebra**
   - Arithmetic, Equations, Functions, Finance.
2. **Geometri og Måling**
   - Shapes, Area, Volume, Units.
3. **Statistik og Sandsynlighed**
   - Data analysis, Probability.

## Integration
The UI uses this structure to:
1. Filter tasks in the **Task Library**.
2. Organize the **Skill Tree** view.
3. Enforce **Allowed Tools** (e.g., disabling the calculator component for "uden hjælpemidler" tasks).

