# Generator API

This guide explains how to build and understand Task Generators.

## The `TaskGenerator` Interface
All generators must implement this interface:

```typescript
export interface TaskGenerator {
  readonly taskType: string  // Unique ID (e.g., 'tal_ligninger')
  readonly name: string      // Human readable name
  readonly requiresLLM: boolean
  
  generate(config?: GeneratorConfig): Promise<GeneratedTask>
}
```

## Logic-Based Generators
Most generators extend `LogicBasedGenerator`. These rely on pure JavaScript logic and math to create problems.

### Key Features
- **Deterministic**: Given the same seed, they produce the exact same task.
- **Fast**: Execution is instant (no API calls).
- **Type-Safe**: You define the exact structure of the problem.

### The `SeededRandom` Helper
To ensure reproducibility (important for debugging and replayability), we use a custom `SeededRandom` class instead of `Math.random()`.

```typescript
const rng = this.createRng(config.seed)
const number = rng.int(1, 10) // Integer between 1 and 10
const item = rng.pick(['apple', 'banana', 'orange'])
```

## Example Implementation
Here is a simplified structure of a generator:

```typescript
export class SimpleAdditionGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_simple_plus'
  readonly name = 'Simple Addition'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // 1. Generate random parameters
    const a = rng.int(1, 100)
    const b = rng.int(1, 100)
    const result = a + b
    
    // 2. Construct the task
    return {
      type: this.taskType,
      title: 'Addition',
      intro: 'Calculate the sum.',
      questions: [
        {
          text: `What is $${a} + ${b}$?`,
          answer: String(result),
          answer_type: 'number'
        }
      ],
      figure: null
    }
  }
}
```

## LLM-Powered Generators
We also support `LLMGenerator` for tasks that require creative writing or complex natural language understanding. These use the OpenAI API.

*Note: Currently, we prefer LogicBasedGenerators for reliability and cost.*

