/**
 * Generator: geo_transformationer
 * 
 * Generates geometric transformation problems
 * - Reflection (spejling)
 * - Translation (parallelforskydning)
 * - Rotation (drejning)
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

type TransformationType = 'reflection' | 'translation' | 'rotation'

const TRANSFORMATION_NAMES: Record<TransformationType, string> = {
  reflection: 'Spejling',
  translation: 'Parallelforskydning',
  rotation: 'Drejning',
}

export class TransformationerGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_transformationer'
  readonly name = 'Geometriske transformationer'

  private generateShapeSVG(
    original: { x: number; y: number }[],
    transformed: { x: number; y: number }[],
    _transformation: TransformationType,
    showAxis?: { type: 'vertical' | 'horizontal'; pos: number }
  ): string {
    const width = 280
    const height = 200
    
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    
    // Grid
    svg += `<g stroke="#e5e5e5" stroke-width="1">`
    for (let x = 0; x <= width; x += 20) {
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}"/>`
    }
    for (let y = 0; y <= height; y += 20) {
      svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}"/>`
    }
    svg += `</g>`
    
    // Transformation axis/center
    if (showAxis) {
      svg += `<g stroke="#666" stroke-width="2" stroke-dasharray="5,5">`
      if (showAxis.type === 'vertical') {
        svg += `<line x1="${showAxis.pos}" y1="0" x2="${showAxis.pos}" y2="${height}"/>`
      } else {
        svg += `<line x1="0" y1="${showAxis.pos}" x2="${width}" y2="${showAxis.pos}"/>`
      }
      svg += `</g>`
    }
    
    // Original shape
    const origPoints = original.map(p => `${p.x},${p.y}`).join(' ')
    svg += `<polygon points="${origPoints}" fill="rgba(99,102,241,0.3)" stroke="#6366F1" stroke-width="2"/>`
    svg += `<text x="${original[0].x + 5}" y="${original[0].y - 5}" font-size="14" font-weight="bold" fill="#6366F1">A</text>`
    
    // Transformed shape
    const transPoints = transformed.map(p => `${p.x},${p.y}`).join(' ')
    svg += `<polygon points="${transPoints}" fill="rgba(194,114,90,0.3)" stroke="#C2725A" stroke-width="2"/>`
    svg += `<text x="${transformed[0].x + 5}" y="${transformed[0].y - 5}" font-size="14" font-weight="bold" fill="#C2725A">B</text>`
    
    svg += `</svg>`
    return svg
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    const correctTransformation = rng.pick<TransformationType>(['reflection', 'translation', 'rotation'])
    
    // Base shape (L-shape)
    const original = [
      { x: 60, y: 60 },
      { x: 100, y: 60 },
      { x: 100, y: 80 },
      { x: 80, y: 80 },
      { x: 80, y: 120 },
      { x: 60, y: 120 },
    ]
    
    let transformed: { x: number; y: number }[]
    let showAxis: { type: 'vertical' | 'horizontal'; pos: number } | undefined
    
    switch (correctTransformation) {
      case 'reflection': {
        // Reflect across vertical axis at x=140
        const axisX = 140
        transformed = original.map(p => ({ x: 2 * axisX - p.x, y: p.y }))
        showAxis = { type: 'vertical', pos: axisX }
        break
      }
      
      case 'translation': {
        // Translate right and down
        const dx = 100
        const dy = 40
        transformed = original.map(p => ({ x: p.x + dx, y: p.y + dy }))
        break
      }
      
      case 'rotation': {
        // Rotate 90 degrees clockwise around a center point
        const cx = 140
        const cy = 100
        transformed = original.map(p => ({
          x: cx + (p.y - cy),
          y: cy - (p.x - cx) + 80,
        }))
        break
      }
    }
    
    const svg = this.generateShapeSVG(original, transformed, correctTransformation, showAxis)
    
    // Generate options
    const allTransformations: TransformationType[] = ['reflection', 'translation', 'rotation']
    const options = rng.shuffle(allTransformations)
    const correctLetter = String.fromCharCode(65 + options.indexOf(correctTransformation))

    return {
      type: this.taskType,
      title: 'Geometriske transformationer',
      intro: 'Figur A er blevet transformeret til figur B.',
      figure: {
        type: 'svg',
        content: svg,
      },
      questions: [
        {
          text: `Hvilken transformation er brugt?\n\nA) ${TRANSFORMATION_NAMES[options[0]]}\nB) ${TRANSFORMATION_NAMES[options[1]]}\nC) ${TRANSFORMATION_NAMES[options[2]]}`,
          answer: correctLetter,
          answer_type: 'multiple_choice',
          accept_alternatives: [TRANSFORMATION_NAMES[correctTransformation]],
        }
      ],
      variables: {
        transformation: correctTransformation,
      }
    }
  }
}

