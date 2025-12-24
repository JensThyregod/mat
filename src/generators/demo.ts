/**
 * Task Generator Demo
 * 
 * This file demonstrates how to use the task generation system.
 * Run with: npx vite-node src/generators/demo.ts
 * 
 * Or import and use in your application.
 */

import { 
  initGenerators, 
  generateTask, 
  generateTaskInstance,
  getSupportedTypes,
  requiresLLM 
} from './index'

// Your OpenAI API key (set via VITE_OPENAI_API_KEY env var or pass directly)
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

async function demo() {
  console.log('🎲 Task Generator Demo\n')
  console.log('=' .repeat(60))
  
  // Initialize with API key
  initGenerators(OPENAI_API_KEY)
  
  // Show all supported types
  const types = getSupportedTypes()
  console.log('\n📋 Supported task types:\n')
  types.forEach(t => {
    const llm = requiresLLM(t) ? '🤖 LLM' : '⚡ Logic'
    console.log(`  ${llm}  ${t}`)
  })
  
  console.log('\n' + '='.repeat(60))
  
  // Demo: Generate a logic-based task
  console.log('\n📐 Generating logic-based task (tal_ligninger):\n')
  const task1 = await generateTask('tal_ligninger')
  console.log('Title:', task1.title)
  console.log('Intro:', task1.intro)
  console.log('Question:', task1.questions[0].text)
  console.log('Answer:', task1.questions[0].answer)
  console.log('Variables:', task1.variables)
  
  console.log('\n' + '='.repeat(60))
  
  // Demo: Generate a geometry task
  console.log('\n📐 Generating geometry task (geo_vinkelsum):\n')
  const task2 = await generateTask('geo_vinkelsum')
  console.log('Title:', task2.title)
  console.log('Intro:', task2.intro)
  console.log('Figure:', JSON.stringify(task2.figure, null, 2))
  task2.questions.forEach((q, i) => {
    console.log(`Q${i + 1}: ${q.text} → ${q.answer}`)
  })
  
  console.log('\n' + '='.repeat(60))
  
  // Demo: Generate a statistics task
  console.log('\n📊 Generating statistics task (stat_sandsynlighed):\n')
  const task3 = await generateTask('stat_sandsynlighed')
  console.log('Title:', task3.title)
  console.log('Intro:', task3.intro)
  task3.questions.forEach((q, i) => {
    console.log(`Q${i + 1}: ${q.text} → ${q.answer}`)
  })
  
  console.log('\n' + '='.repeat(60))
  
  // Demo: Generate an LLM-powered task
  console.log('\n🤖 Generating LLM-powered task (tal_broeker_og_antal):\n')
  try {
    const task4 = await generateTask('tal_broeker_og_antal')
    console.log('Title:', task4.title)
    console.log('Intro:', task4.intro)
    task4.questions.forEach((q, i) => {
      console.log(`Q${i + 1}: ${q.text} → ${q.answer}`)
    })
    console.log('Variables:', task4.variables)
  } catch (error) {
    console.log('Error (expected if no API key):', error)
  }
  
  console.log('\n' + '='.repeat(60))
  
  // Demo: Generate as TaskInstance (with ID)
  console.log('\n🎯 Generating as TaskInstance:\n')
  const instance = await generateTaskInstance('tal_regnearter')
  console.log('ID:', instance.id)
  console.log('Type:', instance.type)
  console.log('Title:', instance.title)
  console.log('Question:', instance.questions[0].text)
  console.log('Answer:', instance.questions[0].answer)
  
  console.log('\n✅ Demo complete!\n')
}

// Run demo
demo().catch(console.error)

