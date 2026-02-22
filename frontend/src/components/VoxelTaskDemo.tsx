/**
 * Demo component for the Voxel Projection Task system
 * 
 * Uses procedural generation to create figures with:
 * - Difficulty-based cube counts (easy: 4, medium: 7, hard: 10)
 * - Orthogonally connected cubes only (no diagonal connections)
 * - Similar-looking distractors that differ in projections
 */

import { useState, useMemo } from 'react'
import {
  generateProceduralTask,
  generateProjectionTask,
  renderComplete,
  DIFFICULTY_CONFIG,
  type ProjectionTask,
  type VoxelFigure,
} from '../utils/voxel'

type Difficulty = 'easy' | 'medium' | 'hard'

export function VoxelTaskDemo() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [taskKey, setTaskKey] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  // Generate task using procedural generation
  const task: ProjectionTask = useMemo(() => {
    const { correctFigure, distractors } = generateProceduralTask(difficulty)
    
    const renderOptions = { cubeSize: 18, padding: 8 }
    
    return generateProjectionTask({
      correctFigure,
      distractors,
      showProjections: ['top', 'front', 'side'],
      shuffleOptions: true,
    }, renderOptions)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, taskKey])

  const handleNewTask = () => {
    setTaskKey(k => k + 1)
    setSelectedAnswer(null)
    setShowResult(false)
  }

  const handleSubmit = () => {
    if (selectedAnswer) {
      setShowResult(true)
    }
  }

  const isCorrect = selectedAnswer === task.correctAnswer
  const config = DIFFICULTY_CONFIG[difficulty]

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '900px', 
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      color: '#e2e8f0',
    }}>
      <h1 style={{ color: '#60a5fa', marginBottom: '0.5rem' }}>
        3D-figurer og projektioner
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
        Hvilken 3D-figur passer til de viste projektioner?
      </p>
      
      {/* Info badge */}
      <div style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        backgroundColor: '#1e293b',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        color: '#94a3b8',
        marginBottom: '1.5rem',
      }}>
        {config.cubeCount} klodser per figur
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <label style={{ color: '#94a3b8' }}>
          Sværhedsgrad:
          <select 
            value={difficulty} 
            onChange={e => {
              setDifficulty(e.target.value as Difficulty)
              handleNewTask()
            }}
            style={{
              marginLeft: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '4px',
            }}
          >
            <option value="easy">Let ({DIFFICULTY_CONFIG.easy.cubeCount} klodser, 3 muligheder)</option>
            <option value="medium">Middel ({DIFFICULTY_CONFIG.medium.cubeCount} klodser, 4 muligheder)</option>
            <option value="hard">Svær ({DIFFICULTY_CONFIG.hard.cubeCount} klodser, 5 muligheder)</option>
          </select>
        </label>

        <button
          onClick={handleNewTask}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Ny opgave
        </button>
      </div>

      {/* Projections */}
      <div style={{ 
        display: 'flex', 
        gap: '1.5rem', 
        marginBottom: '2rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {task.projections.map(proj => (
          <div key={proj.type} style={{ textAlign: 'center' }}>
            <div 
              style={{ 
                backgroundColor: '#1e293b',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #334155',
              }}
              dangerouslySetInnerHTML={{ __html: proj.svg }}
            />
            <div style={{ 
              marginTop: '0.5rem', 
              color: '#94a3b8',
              fontSize: '0.875rem',
            }}>
              {proj.label}
            </div>
          </div>
        ))}
      </div>

      {/* Options */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {task.options.map(option => {
          const isSelected = selectedAnswer === option.label
          
          let borderColor = '#334155'
          let bgColor = '#1e293b'
          
          if (showResult) {
            if (option.isCorrect) {
              borderColor = '#22c55e'
              bgColor = 'rgba(34, 197, 94, 0.1)'
            } else if (isSelected && !option.isCorrect) {
              borderColor = '#ef4444'
              bgColor = 'rgba(239, 68, 68, 0.1)'
            }
          } else if (isSelected) {
            borderColor = '#60a5fa'
            bgColor = 'rgba(96, 165, 250, 0.1)'
          }

          return (
            <button
              key={option.label}
              onClick={() => !showResult && setSelectedAnswer(option.label)}
              disabled={showResult}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: '8px',
                cursor: showResult ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div 
                style={{ marginBottom: '0.5rem' }}
                dangerouslySetInnerHTML={{ __html: option.svg }}
              />
              <span style={{ 
                color: '#e2e8f0',
                fontWeight: 'bold',
                fontSize: '1.25rem',
              }}>
                {option.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Submit / Result */}
      {!showResult && (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: selectedAnswer ? '#22c55e' : '#334155',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedAnswer ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
          }}
        >
          Tjek svar
        </button>
      )}

      {showResult && (
        <div style={{
          padding: '1rem',
          backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <strong style={{ fontSize: '1.25rem' }}>
            {isCorrect ? '✓ Korrekt!' : `✗ Forkert. Svaret var ${task.correctAnswer}`}
          </strong>
        </div>
      )}

      {/* Debug: Show correct figure's projections */}
      {showResult && (
        <details style={{ marginTop: '2rem' }}>
          <summary style={{ 
            cursor: 'pointer', 
            color: '#94a3b8',
            marginBottom: '1rem',
          }}>
            Vis korrekt figur i detaljer
          </summary>
          <DebugFigure figure={task.options.find(o => o.isCorrect)!.figure} />
        </details>
      )}
    </div>
  )
}

/** Debug component to show a figure from all angles */
function DebugFigure({ figure }: { figure: VoxelFigure }) {
  const rendered = renderComplete(figure, { cubeSize: 16, padding: 8 })
  
  return (
    <div style={{
      backgroundColor: '#1e293b',
      padding: '1rem',
      borderRadius: '8px',
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div dangerouslySetInnerHTML={{ __html: rendered.isometric.svg }} />
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
          Isometrisk visning
        </div>
      </div>
      
      {Object.entries(rendered.projections).map(([key, proj]) => (
        <div key={key} style={{ textAlign: 'center' }}>
          <div dangerouslySetInnerHTML={{ __html: proj.svg }} />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            {proj.label}
          </div>
        </div>
      ))}
      
      <div style={{ fontSize: '0.75rem', color: '#64748b', width: '100%' }}>
        <strong>Kuber ({figure.cubes.length}):</strong>{' '}
        {figure.cubes.map(c => `[${c.join(',')}]`).join(' ')}
      </div>
    </div>
  )
}

export default VoxelTaskDemo
