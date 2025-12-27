# How to Create a New Task Type

This guide walks you through adding a new math problem type to the system.

## 1. Define the Task Type
Create a new YAML file in `curriculum/task-types/`.
Name it descriptively, e.g., `tal_plus_minus.yaml`.

```yaml
id: tal_plus_minus
name: Plus og Minus
category: tal_og_algebra
subcategory: regnearter
level: fp9
exam_part: uden_hjaelpemidler
difficulty: let

description: Simpelt plus og minus.
allowed_tools:
  calculator: false
  formula_sheet: false
```

## 2. Implement the Generator
Create a new file `src/generators/logic/plus-minus.ts`.

```typescript
import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

export class PlusMinusGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_plus_minus' // Must match YAML id
  readonly name = 'Plus og Minus'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    const a = rng.int(1, 20)
    const b = rng.int(1, 20)
    
    return {
      type: this.taskType,
      title: this.name,
      intro: 'Beregn stykket.',
      questions: [
        {
          text: `Hvad er $${a} + ${b}$?`,
          answer: String(a + b),
          answer_type: 'number'
        }
      ],
      figure: null
    }
  }
}
```

## 3. Register the Generator
Open `src/generators/registry.ts`.

1. Import your class:
```typescript
import { PlusMinusGenerator } from './logic/plus-minus'
```

2. Add it to the `registerAll` method:
```typescript
private registerAll(): void {
  // ...
  this.register(new PlusMinusGenerator())
}
```

## 4. Export the Generator
Open `src/generators/logic/index.ts` (or where your logic barrel file is) and export it so it can be imported by the registry.

## 5. Verify
1. Start the dev server: `npm run dev`
2. Go to `/test-lab` (Login as 'test').
3. Select your new task type from the dropdown.
4. Click "Generate" to see it in action.

