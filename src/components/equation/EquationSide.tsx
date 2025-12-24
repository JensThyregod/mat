import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  tryParse,
  analyzeFraction,
  analyzeExpression,
  tokenize as cfgTokenize,
  type Token as CFGToken,
  type SimplificationOpportunity,
  type TokenLocation,
} from '../../utils/expression'

export type ExpressionPart = {
  numerator: string
  denominator?: string
}

type Props = {
  side: 'left' | 'right'
  expression: ExpressionPart
  activeZone: 'inline' | 'below' | null
  onHover: (zone: 'inline' | 'below' | null) => void
  onSubmit: (operation: string, isDivision?: boolean) => void
}

// Display token for rendering (mapped from CFG tokens)
type DisplayToken = { 
  type: 'number' | 'variable' | 'operator' | 'power' | 'paren'
  value: string
  location: TokenLocation
  numericValue?: number
}

// Convert CFG tokens to display tokens
function toDisplayTokens(tokens: CFGToken[]): DisplayToken[] {
  const result: DisplayToken[] = []
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    
    // Skip EOF
    if (token.type === 'EOF') continue
    
    // Skip implicit multiplication tokens (they have zero-length location)
    if (token.type === 'MULTIPLY' && token.location.start === token.location.end) {
      continue
    }
    
    let displayType: DisplayToken['type']
    switch (token.type) {
      case 'NUMBER':
        displayType = 'number'
        break
      case 'VARIABLE':
        displayType = 'variable'
        break
      case 'PLUS':
      case 'MINUS':
      case 'MULTIPLY':
      case 'DIVIDE':
        displayType = 'operator'
        break
      case 'POWER':
        displayType = 'power'
        break
      case 'LPAREN':
      case 'RPAREN':
        displayType = 'paren'
        break
      default:
        continue
    }
    
    // Map operator values to display characters
    let displayValue = token.value
    if (token.type === 'MULTIPLY') displayValue = '×'
    if (token.type === 'DIVIDE') displayValue = '÷'
    if (token.type === 'PLUS') displayValue = '+'
    if (token.type === 'MINUS') displayValue = '-'
    
    result.push({
      type: displayType,
      value: displayValue,
      location: token.location,
      numericValue: token.numericValue,
    })
  }
  
  return result
}

// Check if a token's location overlaps with any opportunity location
function isTokenHighlighted(
  token: DisplayToken,
  opportunities: SimplificationOpportunity[],
  partType: 'numerator' | 'denominator'
): boolean {
  for (const opp of opportunities) {
    if (opp.type === 'common-factor') {
      const locs = partType === 'denominator' 
        ? opp.denominatorLocations 
        : opp.numeratorLocations
      if (locs.some(l => overlaps(l, token.location))) {
        return true
      }
    } else if (opp.type === 'like-terms') {
      if (opp.locations.some(l => overlaps(l, token.location))) {
        return true
      }
    } else if (opp.type === 'reducible-fraction') {
      if (partType === 'numerator' && overlaps(opp.numeratorLocation, token.location)) {
        return true
      }
      if (partType === 'denominator' && overlaps(opp.denominatorLocation, token.location)) {
        return true
      }
    }
  }
  return false
}

// Check if a token can trigger highlighting (is in denominator and has common factor)
function canTokenTriggerHighlight(
  token: DisplayToken,
  opportunities: SimplificationOpportunity[]
): SimplificationOpportunity | null {
  for (const opp of opportunities) {
    if (opp.type === 'common-factor') {
      if (opp.denominatorLocations.some(l => overlaps(l, token.location))) {
        return opp
      }
    }
  }
  return null
}

function overlaps(a: TokenLocation, b: TokenLocation): boolean {
  // Two intervals [a.start, a.end) and [b.start, b.end) overlap if:
  // a.start < b.end AND b.start < a.end
  return a.start < b.end && b.start < a.end
}

export const EquationSide = ({ 
  side, 
  expression, 
  activeZone,
  onHover, 
  onSubmit 
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const inlineInputRef = useRef<HTMLInputElement>(null)
  const divisionInputRef = useRef<HTMLInputElement>(null)
  const [inlineValue, setInlineValue] = useState('')
  const [divisionValue, setDivisionValue] = useState('')
  const [isHoveringBelow, setIsHoveringBelow] = useState(false)
  const [hoveredOpportunity, setHoveredOpportunity] = useState<SimplificationOpportunity | null>(null)

  const isFraction = !!expression.denominator

  // Parse and tokenize using CFG parser
  const numeratorTokens = useMemo(() => {
    const tokens = cfgTokenize(expression.numerator)
    return toDisplayTokens(tokens)
  }, [expression.numerator])

  const denominatorTokens = useMemo(() => {
    if (!expression.denominator) return []
    const tokens = cfgTokenize(expression.denominator)
    return toDisplayTokens(tokens)
  }, [expression.denominator])

  // Analyze for simplification opportunities
  const opportunities = useMemo(() => {
    const numAst = tryParse(expression.numerator)
    const denAst = expression.denominator ? tryParse(expression.denominator) : null
    
    if (!numAst) return []
    
    if (denAst) {
      // Fraction - analyze for common factors
      const opps = analyzeFraction(numAst, denAst)
      console.log(`Opportunities for "${expression.numerator}/${expression.denominator}":`, opps)
      return opps
    } else {
      // Just expression - analyze for like terms
      return analyzeExpression(numAst)
    }
  }, [expression.numerator, expression.denominator])

  // Focus appropriate input when zone changes
  useEffect(() => {
    if (activeZone === 'inline' && inlineInputRef.current) {
      setTimeout(() => inlineInputRef.current?.focus(), 50)
    } else if (activeZone === 'below' && divisionInputRef.current) {
      setTimeout(() => divisionInputRef.current?.focus(), 50)
    }
  }, [activeZone])

  // Reset inputs when deactivated
  useEffect(() => {
    if (!activeZone) {
      setInlineValue('')
      setDivisionValue('')
    }
  }, [activeZone])

  const handleExpressionEnter = useCallback(() => {
    setIsHoveringBelow(false)
    onHover('inline')
  }, [onHover])

  const handleExpressionLeave = useCallback(() => {
    if (!inlineValue.trim()) {
      onHover(null)
    }
    setHoveredOpportunity(null)
  }, [onHover, inlineValue])

  const handleBelowZoneEnter = useCallback(() => {
    setIsHoveringBelow(true)
    onHover('below')
  }, [onHover])

  const handleBelowZoneLeave = useCallback(() => {
    if (!divisionValue.trim()) {
      setIsHoveringBelow(false)
      onHover(null)
    }
  }, [onHover, divisionValue])

  const handleContainerLeave = useCallback(() => {
    if (!inlineValue.trim() && !divisionValue.trim()) {
      setIsHoveringBelow(false)
      onHover(null)
    }
    setHoveredOpportunity(null)
  }, [onHover, inlineValue, divisionValue])

  const handleInlineKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inlineValue.trim()) {
      onSubmit(inlineValue.trim(), false)
      setInlineValue('')
    }
    if (e.key === 'Escape') {
      setInlineValue('')
      onHover(null)
    }
  }, [inlineValue, onSubmit, onHover])

  const handleDivisionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && divisionValue.trim()) {
      onSubmit(divisionValue.trim(), true)
      setDivisionValue('')
      setIsHoveringBelow(false)
    }
    if (e.key === 'Escape') {
      setDivisionValue('')
      setIsHoveringBelow(false)
      onHover(null)
    }
  }, [divisionValue, onSubmit, onHover])

  const handleTokenHover = useCallback((token: DisplayToken) => {
    const opp = canTokenTriggerHighlight(token, opportunities)
    if (opp) {
      setHoveredOpportunity(opp)
    }
  }, [opportunities])

  const handleTokenLeave = useCallback(() => {
    setHoveredOpportunity(null)
  }, [])

  const operationType = inlineValue.startsWith('+') ? 'add' :
    inlineValue.startsWith('-') ? 'subtract' :
    inlineValue.startsWith('*') || inlineValue.startsWith('×') ? 'multiply' :
    inlineValue.startsWith('/') || inlineValue.startsWith('÷') ? 'divide' : null

  const showDivisionBar = isHoveringBelow || activeZone === 'below'

  // Determine if a token should be highlighted based on hovered opportunity
  // Only numerator tokens should get the "common factor" highlight - the denominator
  // is what triggers the highlight, it shouldn't highlight itself
  const isHighlightedByHover = useCallback((token: DisplayToken, partType: 'numerator' | 'denominator'): boolean => {
    if (!hoveredOpportunity) return false
    
    // Only highlight numerator tokens, not denominator tokens
    if (partType !== 'numerator') return false
    
    if (hoveredOpportunity.type === 'common-factor') {
      return hoveredOpportunity.numeratorLocations.some(l => overlaps(l, token.location))
    }
    
    return false
  }, [hoveredOpportunity])

  // Check if token can trigger (is in denominator and part of an opportunity)
  const canTrigger = useCallback((token: DisplayToken): boolean => {
    return canTokenTriggerHighlight(token, opportunities) !== null
  }, [opportunities])

  // Render a single token
  const renderToken = (token: DisplayToken, idx: number, partType: 'numerator' | 'denominator') => {
    const isNumerator = partType === 'numerator'
    const isHighlighted = isHighlightedByHover(token, partType)
    const canHighlight = !isNumerator && canTrigger(token)
    const isHovered = !isNumerator && hoveredOpportunity && 
      hoveredOpportunity.type === 'common-factor' &&
      hoveredOpportunity.denominatorLocations.some(l => overlaps(l, token.location))
    
    return (
      <span 
        key={`${idx}-${token.location.start}`} 
        className={`eq-token eq-token--${token.type} ${isHighlighted ? 'eq-token--common-factor' : ''} ${canHighlight ? 'eq-token--can-simplify' : ''} ${isHovered ? 'eq-token--hovered' : ''}`}
        onMouseEnter={canHighlight ? () => handleTokenHover(token) : undefined}
        onMouseLeave={canHighlight ? handleTokenLeave : undefined}
      >
        {token.type === 'power' ? (
          <sup className="eq-token__power">{token.value}</sup>
        ) : (
          token.value
        )}
      </span>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`eq-side ${activeZone === 'inline' ? 'eq-side--inline' : ''} ${activeZone === 'below' ? 'eq-side--division' : ''} ${isFraction ? 'eq-side--is-fraction' : ''}`}
      data-side={side}
      onMouseLeave={handleContainerLeave}
    >
      {/* Expression area */}
      <div 
        className="eq-side__expression"
        onMouseEnter={handleExpressionEnter}
        onMouseLeave={handleExpressionLeave}
      >
        {isFraction ? (
          <div className="eq-fraction">
            <div className="eq-fraction__numerator">
              {numeratorTokens.map((token, i) => renderToken(token, i, 'numerator'))}
            </div>
            <div className="eq-fraction__bar" />
            <div className="eq-fraction__denominator">
              {denominatorTokens.map((token, i) => renderToken(token, i, 'denominator'))}
            </div>
          </div>
        ) : (
          <div className="eq-side__tokens">
            {numeratorTokens.map((token, i) => renderToken(token, i, 'numerator'))}
          </div>
        )}

        {/* Inline input */}
        <div className={`eq-side__inline ${activeZone === 'inline' ? 'eq-side__inline--visible' : ''}`}>
          <input
            ref={inlineInputRef}
            type="text"
            className={`eq-side__input ${operationType ? `eq-side__input--${operationType}` : ''}`}
            placeholder="+5"
            value={inlineValue}
            onChange={(e) => setInlineValue(e.target.value)}
            onKeyDown={handleInlineKeyDown}
            tabIndex={activeZone === 'inline' ? 0 : -1}
          />
        </div>
      </div>

      {/* Below zone for new division */}
      <div 
        className="eq-side__below-zone"
        onMouseEnter={handleBelowZoneEnter}
        onMouseLeave={handleBelowZoneLeave}
      >
        <div className={`eq-side__new-fraction-bar ${showDivisionBar ? 'eq-side__new-fraction-bar--visible' : ''}`} />
        
        <div className={`eq-side__denominator ${activeZone === 'below' ? 'eq-side__denominator--visible' : ''}`}>
          <input
            ref={divisionInputRef}
            type="text"
            className="eq-side__division-input"
            placeholder="?"
            value={divisionValue}
            onChange={(e) => setDivisionValue(e.target.value)}
            onKeyDown={handleDivisionKeyDown}
            tabIndex={activeZone === 'below' ? 0 : -1}
          />
        </div>
      </div>
    </div>
  )
}
