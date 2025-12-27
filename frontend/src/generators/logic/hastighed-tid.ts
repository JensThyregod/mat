/**
 * Generator: tal_hastighed_tid
 * 
 * Generates speed and time calculation problems
 * - Calculate average speed
 * - Find time for a distance
 * - Find distance from speed and time
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

const TRANSPORT_MODES = [
  { mode: 'cykel', speeds: [15, 18, 20, 22, 25], unit: 'km/t' },
  { mode: 'bil', speeds: [50, 60, 80, 90, 100, 110, 120, 130], unit: 'km/t' },
  { mode: 'tog', speeds: [80, 100, 120, 140, 160], unit: 'km/t' },
  { mode: 'løber', speeds: [8, 10, 12, 14, 15], unit: 'km/t' },
  { mode: 'gående', speeds: [4, 5, 6], unit: 'km/t' },
]

const CONTEXTS = [
  { from: 'hjemmet', to: 'skolen' },
  { from: 'København', to: 'Odense' },
  { from: 'stationen', to: 'lufthavnen' },
  { from: 'start', to: 'mål' },
]

export class HastighedTidGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_hastighed_tid'
  readonly name = 'Hastighed og tid'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick problem type
    const problemType = rng.pick(['find_speed', 'find_time', 'find_distance'] as const)
    
    const transport = rng.pick(TRANSPORT_MODES)
    const speed = rng.pick(transport.speeds)
    const context = rng.pick(CONTEXTS)
    
    let intro: string
    let question: string
    let answer: number
    
    switch (problemType) {
      case 'find_speed': {
        // Given distance and time, find speed
        const time = rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 4])
        const distance = speed * time
        intro = `En ${transport.mode} kører fra ${context.from} til ${context.to}.\nAfstanden er ${distance} km og turen tager ${time === 0.5 ? '30 minutter' : time === 1.5 ? '1 time og 30 minutter' : time === 2.5 ? '2 timer og 30 minutter' : `${time} ${time === 1 ? 'time' : 'timer'}`}.`
        question = 'Hvad er gennemsnitshastigheden?'
        answer = speed
        break
      }
      
      case 'find_time': {
        // Given distance and speed, find time
        const timeHours = rng.pick([1, 2, 3, 4, 5])
        const distance = speed * timeHours
        intro = `En ${transport.mode} kører ${distance} km med en gennemsnitshastighed på ${speed} km/t.`
        question = 'Hvor lang tid tager turen?'
        answer = timeHours
        break
      }
      
      case 'find_distance': {
        // Given speed and time, find distance
        const timeHours = rng.pick([1, 2, 3, 4])
        const distance = speed * timeHours
        intro = `En ${transport.mode} kører i ${timeHours} ${timeHours === 1 ? 'time' : 'timer'} med en hastighed på ${speed} km/t.`
        question = 'Hvor langt når den?'
        answer = distance
        break
      }
    }

    const answerUnit = problemType === 'find_speed' ? 'km/t' : 
                       problemType === 'find_time' ? (answer === 1 ? 'time' : 'timer') : 'km'

    return {
      type: this.taskType,
      title: 'Hastighed og tid',
      intro,
      figure: null,
      questions: [
        {
          text: question,
          answer: String(answer),
          answer_type: 'number',
          accept_alternatives: [`${answer} ${answerUnit}`],
        }
      ],
      variables: {
        problemType,
        transport: transport.mode,
        speed,
        answer,
      }
    }
  }
}

