# Expression Engine

Located in `src/utils/expression/`, this is a custom-built mathematical expression engine. It allows us to parse, analyze, and evaluate user inputs symbolically, rather than just comparing strings.

## Pipeline
1. **Lexer**: Converts a string into a stream of tokens (Numbers, Variables, Operators).
2. **Parser**: Converts tokens into an Abstract Syntax Tree (AST).
3. **Analyzer**: Inspects the AST for patterns (e.g., "can this fraction be simplified?").
4. **Evaluator**: Computes the numerical value or simplifies the AST.

## AST Structure
The Abstract Syntax Tree is built from these node types:
- `NumberNode`: `{ type: 'number', value: 5 }`
- `VariableNode`: `{ type: 'variable', name: 'x' }`
- `BinaryNode`: `{ type: 'binary', operator: '+', left: ..., right: ... }`
- `UnaryNode`: `{ type: 'unary', operator: '-', argument: ... }`

## Key Functions

### `evaluateString(expr: string): number | null`
Parses and evaluates an expression to a number.
```typescript
evaluateString("2 + 2 * 3") // -> 8
evaluateString("x + 5") // -> null (cannot evaluate variables without context)
```

### `simplifyString(expr: string): string`
Symbolically simplifies an expression.
```typescript
simplifyString("2x + 3x") // -> "5x"
simplifyString("2/4") // -> "1/2"
```

## Use Cases
- **Answer Checking**: Comparing a user's input (`1/2`) with the expected answer (`0.5` or `2/4`).
- **Hint Generation**: Analyzing a student's wrong answer to see if they made a common mistake (e.g., adding denominators).

