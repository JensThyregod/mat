/**
 * Generator: geo_projektioner
 * 
 * Generates 3D projection problems using the voxel system
 * Wraps the existing voxel generator
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'
import { generateProceduralTask as generateVoxelTask } from '../../utils/voxel'

export class ProjektionerGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_projektioner'
  readonly name = '3D-figurer og projektioner'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    // Map difficulty
    const difficultyMap = {
      'let': 'easy' as const,
      'middel': 'medium' as const,
      'svaer': 'hard' as const,
    }
    
    const difficulty = difficultyMap[config?.difficulty ?? 'middel']
    
    // Use the existing voxel generator
    const voxelTask = generateVoxelTask(difficulty)
    
    // The correct answer is the letter corresponding to the correct figure
    // In a random order, the correct figure is shuffled with distractors
    const rng = this.createRng(config?.seed)
    const allFigures = [voxelTask.correctFigure, ...voxelTask.distractors]
    
    // Shuffle the figures
    const shuffled = rng.shuffle([...allFigures.map((f, i) => ({ figure: f, isCorrect: i === 0 }))])
    const correctIndex = shuffled.findIndex(s => s.isCorrect)
    const correctLetter = String.fromCharCode(65 + correctIndex) // A, B, C, D...
    
    return {
      type: this.taskType,
      title: 'Projektioner',
      intro: 'Fire 3D-figurer er vist sammen med tre projektioner (forfra, fra siden, fra oven). Hvilken 3D-figur passer til de viste projektioner?',
      figure: {
        type: 'voxel',
        difficulty: difficulty,
      },
      questions: [
        {
          text: 'Hvilken 3D-figur passer til de viste projektioner?',
          answer: correctLetter,
          answer_type: 'multiple_choice',
        }
      ],
      variables: { 
        difficulty,
        cubeCount: voxelTask.correctFigure.cubes.length
      }
    }
  }
}

