import { useState, useCallback } from 'react'
import { EquationEditor } from '../components/equation/EquationEditor'
import { evaluateString } from '../utils/expression'
import './LigningerView.css'

export type ExpressionPart = {
  numerator: string
  denominator?: string  // If present, render as fraction
}

export type EquationStep = {
  left: ExpressionPart
  right: ExpressionPart
  operation?: string
}

// Apply operation to expression part
function applyOperation(expr: ExpressionPart, operation: string): ExpressionPart {
  const op = operation[0]
  const value = operation.slice(1).trim()
  
  if (!value) return expr
  
  const currentExpr = expr.denominator 
    ? `(${expr.numerator})/(${expr.denominator})`
    : expr.numerator
  
  // For multiply, wrap and multiply
  if (op === '*' || op === '×') {
    if (expr.denominator) {
      return { numerator: `(${expr.numerator}) × ${value}`, denominator: expr.denominator }
    }
    return { numerator: `(${currentExpr}) × ${value}` }
  }
  
  // For add and subtract
  if (op === '+' || op === '-') {
    if (expr.denominator) {
      // Adding to a fraction - need common denominator, just show it simply for now
      return { numerator: `${expr.numerator} ${op} ${value} × ${expr.denominator}`, denominator: expr.denominator }
    }
    return { numerator: `${currentExpr} ${op} ${value}` }
  }
  
  return expr
}

// Try to simplify basic expressions using CFG-based evaluator
function simplifyValue(expr: string): string {
  // Use the CFG evaluator instead of eval()
  const result = evaluateString(expr)
  
  if (result !== null && !isNaN(result)) {
    // Format the result nicely
    if (Number.isInteger(result)) {
      return result.toString()
    }
    // Remove trailing zeros from decimal
    return result.toFixed(2).replace(/\.?0+$/, '')
  }
  
  // If evaluation fails (contains variables), return original
  return expr
}

function simplifyExpression(expr: ExpressionPart): ExpressionPart {
  return {
    numerator: simplifyValue(expr.numerator),
    denominator: expr.denominator ? simplifyValue(expr.denominator) : undefined
  }
}

// Format expression for display in history
function formatExpression(expr: ExpressionPart): string {
  if (expr.denominator) {
    return `(${expr.numerator})/(${expr.denominator})`
  }
  return expr.numerator
}

export const LigningerView = () => {
  const [steps, setSteps] = useState<EquationStep[]>([
    { left: { numerator: '3x + 5' }, right: { numerator: '17' } }
  ])
  const [selectedEquation, setSelectedEquation] = useState(0)

  const currentStep = steps[steps.length - 1]

  const handleOperation = useCallback((operation: string, isDivision?: boolean) => {
    let newLeft: ExpressionPart
    let newRight: ExpressionPart
    let displayOp: string

    if (isDivision) {
      // Division - create fraction
      if (currentStep.left.denominator) {
        // Already a fraction - multiply denominators
        newLeft = {
          numerator: currentStep.left.numerator,
          denominator: `(${currentStep.left.denominator}) × ${operation}`
        }
      } else {
        newLeft = {
          numerator: currentStep.left.numerator,
          denominator: operation
        }
      }
      
      if (currentStep.right.denominator) {
        newRight = {
          numerator: currentStep.right.numerator,
          denominator: `(${currentStep.right.denominator}) × ${operation}`
        }
      } else {
        newRight = {
          numerator: currentStep.right.numerator,
          denominator: operation
        }
      }
      displayOp = `÷${operation}`
    } else {
      // Regular operation
      const normalizedOp = operation
        .replace(/^\*/, '×')
        .replace(/^\//, '÷')
      
      newLeft = applyOperation(currentStep.left, normalizedOp)
      newRight = applyOperation(currentStep.right, normalizedOp)
      displayOp = normalizedOp
    }
    
    // Simplify
    const simplifiedLeft = simplifyExpression(newLeft)
    const simplifiedRight = simplifyExpression(newRight)
    
    setSteps(prev => [...prev, {
      left: simplifiedLeft,
      right: simplifiedRight,
      operation: displayOp
    }])
  }, [currentStep])

  const handleReset = () => {
    const preset = presetEquations[selectedEquation]
    setSteps([{ left: { numerator: preset.left }, right: { numerator: preset.right } }])
  }

  const handleUndo = () => {
    if (steps.length > 1) {
      setSteps(prev => prev.slice(0, -1))
    }
  }

  const presetEquations = [
    { left: '3x + 5', right: '17', label: 'Linear' },
    { left: '2x - 7', right: '15', label: 'Subtraction' },
    { left: '4x + 12', right: '36', label: 'Larger' },
    { left: '5x', right: '25', label: 'Simple' },
  ]

  return (
    <div className="ligninger">
      {/* Ambient background effects */}
      <div className="ligninger__ambient">
        <div className="ligninger__grid" />
        <div className="ligninger__glow ligninger__glow--1" />
        <div className="ligninger__glow ligninger__glow--2" />
      </div>

      {/* Header */}
      <header className="ligninger__header">
        <div className="ligninger__badge">
          <span className="ligninger__badge-icon">∑</span>
          Interactive Equation Solver
        </div>
        <h1 className="ligninger__title">Løs Ligningen</h1>
        <p className="ligninger__subtitle">
          Hover on either side of the equation and type an operation.
          Hover below to divide (creates a fraction).
        </p>
      </header>

      {/* Equation Presets */}
      <div className="ligninger__presets">
        {presetEquations.map((eq, i) => (
          <button
            key={i}
            className={`ligninger__preset ${selectedEquation === i ? 'active' : ''}`}
            onClick={() => {
              setSelectedEquation(i)
              setSteps([{ left: { numerator: eq.left }, right: { numerator: eq.right } }])
            }}
          >
            <span className="ligninger__preset-label">{eq.label}</span>
            <span className="ligninger__preset-eq">{eq.left} = {eq.right}</span>
          </button>
        ))}
      </div>

      {/* Main Equation Workspace */}
      <section className="ligninger__workspace">
        <EquationEditor
          leftSide={currentStep.left}
          rightSide={currentStep.right}
          onOperation={handleOperation}
        />
      </section>

      {/* Steps History */}
      {steps.length > 1 && (
        <div className="ligninger__history">
          <div className="ligninger__history-header">
            <h3 className="ligninger__history-title">Solution Steps</h3>
            <div className="ligninger__history-actions">
              <button className="ligninger__action-btn" onClick={handleUndo}>
                ↩ Undo
              </button>
              <button className="ligninger__action-btn" onClick={handleReset}>
                ⟳ Reset
              </button>
            </div>
          </div>
          <div className="ligninger__steps">
            {steps.map((step, i) => (
              <div key={i} className={`ligninger__step ${i === steps.length - 1 ? 'ligninger__step--current' : ''}`}>
                <span className="ligninger__step-number">{i + 1}</span>
                <span className="ligninger__step-equation">
                  {formatExpression(step.left)} = {formatExpression(step.right)}
                </span>
                {step.operation && (
                  <span className="ligninger__step-operation">
                    {step.operation}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Help */}
      <div className="ligninger__help">
        <span className="ligninger__help-item"><code>+5</code> add</span>
        <span className="ligninger__help-item"><code>-3</code> subtract</span>
        <span className="ligninger__help-item"><code>*2</code> multiply</span>
        <span className="ligninger__help-item ligninger__help-item--division">hover below → divide</span>
      </div>
    </div>
  )
}
