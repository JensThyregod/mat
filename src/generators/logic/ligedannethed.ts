/**
 * Generator: geo_ligedannethed
 * 
 * Generates similarity and scale problems
 * - Use length ratios
 * - Calculate new side lengths
 * - Compare areas
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

export class LigedannethedGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_ligedannethed'
  readonly name = 'Ligedannethed og målestok'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    const problemType = rng.pick(['scale_length', 'find_scale', 'area_ratio'] as const)
    
    let intro: string
    let questions: Array<{ text: string; answer: string; answer_type: 'number' | 'fraction' | 'text'; accept_alternatives?: string[] }>
    let svg: string
    
    switch (problemType) {
      case 'scale_length': {
        // Given scale factor, find new length
        const scale = rng.pick([2, 3, 4, 5])
        const originalSide = rng.intStep(3, 12, 1)
        const scaledSide = originalSide * scale
        
        // Generate a simple triangle
        svg = this.generateSimilarTrianglesSVG(originalSide, scale)
        
        intro = `To trekanter er ligedannede. Den lille trekant har en side på ${originalSide} cm, og målestoksforholdet er 1:${scale}.`
        
        questions = [
          {
            text: 'Hvor lang er den tilsvarende side i den store trekant?',
            answer: String(scaledSide),
            answer_type: 'number',
            accept_alternatives: [`${scaledSide} cm`],
          },
          {
            text: 'Hvor mange gange større er arealet af den store trekant?',
            answer: String(scale * scale),
            answer_type: 'number',
            accept_alternatives: [`${scale}²`, `${scale * scale} gange`],
          }
        ]
        break
      }
      
      case 'find_scale': {
        // Given two corresponding sides, find scale
        const scale = rng.pick([2, 3, 4, 5])
        const smallSide = rng.intStep(2, 8, 1)
        const largeSide = smallSide * scale
        
        svg = this.generateSimilarTrianglesSVG(smallSide, scale)
        
        intro = `To ligedannede trekanter har tilsvarende sider på ${smallSide} cm og ${largeSide} cm.`
        
        questions = [
          {
            text: 'Hvad er målestoksforholdet (lille:stor)?',
            answer: `1:${scale}`,
            answer_type: 'text',
            accept_alternatives: [`1/${scale}`, `1 til ${scale}`],
          },
          {
            text: `Hvis en anden side i den lille trekant er 4 cm, hvor lang er den tilsvarende side i den store?`,
            answer: String(4 * scale),
            answer_type: 'number',
            accept_alternatives: [`${4 * scale} cm`],
          }
        ]
        break
      }
      
      case 'area_ratio': {
        // Area ratio problems
        const scale = rng.pick([2, 3, 4])
        const smallArea = rng.intStep(4, 20, 2)
        const largeArea = smallArea * scale * scale
        
        svg = this.generateSimilarTrianglesSVG(4, scale)
        
        intro = `To ligedannede figurer har målestoksforholdet 1:${scale}. Den lille figur har et areal på ${smallArea} cm².`
        
        questions = [
          {
            text: 'Hvad er arealet af den store figur?',
            answer: String(largeArea),
            answer_type: 'number',
            accept_alternatives: [`${largeArea} cm²`, `${largeArea} cm^2`],
          }
        ]
        break
      }
    }

    return {
      type: this.taskType,
      title: 'Ligedannethed og målestok',
      intro,
      figure: {
        type: 'svg',
        content: svg,
      },
      questions,
      variables: {
        problemType,
      }
    }
  }

  private generateSimilarTrianglesSVG(smallBase: number, scale: number): string {
    const width = 300
    const height = 180
    
    // Small triangle
    const smallHeight = smallBase * 0.8
    const s = { 
      A: { x: 30, y: 150 },
      B: { x: 30 + smallBase * 8, y: 150 },
      C: { x: 30 + smallBase * 4, y: 150 - smallHeight * 8 }
    }
    
    // Large triangle (scaled and positioned to the right)
    const largeBase = smallBase * scale
    const largeHeight = smallHeight * scale
    const maxLargeWidth = largeBase * 8
    const scaleFactor = Math.min(1, (width - 150) / maxLargeWidth)
    
    const l = {
      A: { x: 140, y: 160 },
      B: { x: 140 + largeBase * 5 * scaleFactor, y: 160 },
      C: { x: 140 + largeBase * 2.5 * scaleFactor, y: 160 - largeHeight * 5 * scaleFactor }
    }
    
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    
    // Small triangle
    svg += `<polygon points="${s.A.x},${s.A.y} ${s.B.x},${s.B.y} ${s.C.x},${s.C.y}" fill="rgba(194,114,90,0.2)" stroke="#C2725A" stroke-width="2"/>`
    svg += `<text x="${(s.A.x + s.B.x) / 2}" y="${s.A.y + 15}" font-size="11" text-anchor="middle">${smallBase} cm</text>`
    
    // Large triangle
    svg += `<polygon points="${l.A.x},${l.A.y} ${l.B.x},${l.B.y} ${l.C.x},${l.C.y}" fill="rgba(99,102,241,0.2)" stroke="#6366F1" stroke-width="2"/>`
    svg += `<text x="${(l.A.x + l.B.x) / 2}" y="${l.A.y + 15}" font-size="11" text-anchor="middle">${largeBase} cm</text>`
    
    // Scale indicator
    svg += `<text x="${width / 2}" y="20" font-size="12" text-anchor="middle" fill="#666">Målestok 1:${scale}</text>`
    
    svg += `</svg>`
    return svg
  }
}

