# Content System

## Overview
The content system separates the educational data from the application logic. While the **Task Engine** generates problems, the **Content System** defines *what* kinds of problems exist, their rules, and their educational context.

## File Organization
All content definitions live in the `curriculum/` directory at the project root.

```
curriculum/
├── levels/
│   └── fp9/
│       └── meta.yaml        # Rules for 9. klasse exams
└── task-types/
    ├── tal_broeker.yaml     # Definition for fraction tasks
    ├── geo_vinkelsum.yaml   # Definition for geometry tasks
    └── ...
```

## The Data Model
There are two core concepts:

1. **`TaskType`**: A blueprint or class of problem (e.g., "Pythagorean Theorem"). It defines the difficulty, allowed tools, and variable constraints.
2. **`TaskInstance`**: A concrete problem with specific numbers (e.g., "Find the hypotenuse of a 3-4-5 triangle").

In our system:
- **`TaskTypes`** are defined in YAML files in `curriculum/task-types/`.
- **`TaskInstances`** are mostly generated on-the-fly by the Generator Engine, but can also be defined statically in YAML for testing or fixed problem sets.

## Parsing
The application reads these YAML files using `src/utils/yamlTaskParser.ts`. This parser validates the structure against our TypeScript interfaces (`TaskTypeDefinition` and `TaskInstance`) to ensure type safety at runtime.

