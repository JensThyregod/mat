/**
 * App Smoke Tests
 * 
 * These tests verify that all active routes and components
 * can be imported and rendered without crashing.
 * Run before removing any code to establish a baseline.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider, createRootStore } from '../stores/storeProvider'

const motionPropNames = new Set([
  'initial', 'animate', 'exit', 'transition',
  'variants', 'whileHover', 'whileTap', 'whileFocus',
  'layoutId', 'layout',
])

const stripMotionProps = (props: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(props).filter(([k]) => !motionPropNames.has(k)))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const cleanProps = stripMotionProps(props)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Element = Tag as any
      return <Element {...cleanProps}>{children}</Element>
    }
  }
  
  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      button: createMotionComponent('button'),
      header: createMotionComponent('header'),
      nav: createMotionComponent('nav'),
      aside: createMotionComponent('aside'),
      form: createMotionComponent('form'),
      p: createMotionComponent('p'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
      a: createMotionComponent('a'),
      section: createMotionComponent('section'),
      input: createMotionComponent('input'),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    LayoutGroup: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useMotionValue: () => ({ set: () => {} }),
    useSpring: (v: unknown) => v,
    useTransform: () => 0,
  }
})

// Test wrapper with router and store
function TestWrapper({ children, initialRoute = '/' }: { children: React.ReactNode; initialRoute?: string }) {
  const store = createRootStore()
  return (
    <StoreProvider value={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </StoreProvider>
  )
}

describe('App Component Imports', () => {
  it('imports App without errors', async () => {
    const { default: App } = await import('../App')
    expect(App).toBeDefined()
  })

  it('imports Layout without errors', async () => {
    const { Layout } = await import('../components/Layout')
    expect(Layout).toBeDefined()
  })

  it('imports all view components', async () => {
    const { LoginView } = await import('../views/LoginView')
    const { DashboardView } = await import('../views/DashboardView')
    const { TasksView } = await import('../views/TasksView')
    const { GeneratorTestView } = await import('../views/GeneratorTestView')
    const { LigningerView } = await import('../views/LigningerView')
    const { SkillTreeView } = await import('../views/SkillTreeView')
    
    expect(LoginView).toBeDefined()
    expect(DashboardView).toBeDefined()
    expect(TasksView).toBeDefined()
    expect(GeneratorTestView).toBeDefined()
    expect(LigningerView).toBeDefined()
    expect(SkillTreeView).toBeDefined()
  })

  it('imports VoxelTaskDemo without errors', async () => {
    const { VoxelTaskDemo } = await import('../components/VoxelTaskDemo')
    expect(VoxelTaskDemo).toBeDefined()
  })
})

describe('Active Component Imports', () => {
  it('imports Sidebar (used in Layout)', async () => {
    const { Sidebar } = await import('../components/Sidebar')
    expect(Sidebar).toBeDefined()
  })

  it('imports TabBar (used in Layout)', async () => {
    const { TabBar } = await import('../components/TabBar')
    expect(TabBar).toBeDefined()
  })

  it('imports GlassCard (used in Dashboard)', async () => {
    const { GlassCard, InteractiveCard } = await import('../components/GlassCard')
    expect(GlassCard).toBeDefined()
    expect(InteractiveCard).toBeDefined()
  })

  it('imports TaskCard (used in TasksView)', async () => {
    const { TaskCard } = await import('../components/TaskCard')
    expect(TaskCard).toBeDefined()
  })

  it('imports Tag (used in TaskCard)', async () => {
    const { Tag } = await import('../components/Tag')
    expect(Tag).toBeDefined()
  })

  it('imports animation components', async () => {
    const { PageTransition, AnimatedList, AnimatedListItem } = await import('../components/animation')
    expect(PageTransition).toBeDefined()
    expect(AnimatedList).toBeDefined()
    expect(AnimatedListItem).toBeDefined()
  })

  it('imports equation editor components', async () => {
    const { EquationEditor } = await import('../components/equation')
    expect(EquationEditor).toBeDefined()
  })

  it('imports UI primitives', async () => {
    const { Button } = await import('../components/Button')
    const { Input } = await import('../components/Input')
    const { Spinner } = await import('../components/Spinner')
    const { EmptyState } = await import('../components/EmptyState')
    const { ProgressRing } = await import('../components/ProgressRing')
    
    expect(Button).toBeDefined()
    expect(Input).toBeDefined()
    expect(Spinner).toBeDefined()
    expect(EmptyState).toBeDefined()
    expect(ProgressRing).toBeDefined()
  })
})

describe('Store Imports', () => {
  it('can create root store', () => {
    const store = createRootStore()
    expect(store.authStore).toBeDefined()
    expect(store.taskStore).toBeDefined()
  })
})

describe('Route Rendering', () => {
  it('renders LoginView component', async () => {
    const { LoginView } = await import('../views/LoginView')
    
    render(
      <TestWrapper initialRoute="/login">
        <LoginView />
      </TestWrapper>
    )
    
    // Login page should show some login-related content
    expect(screen.getByRole('button', { name: /log ind/i })).toBeInTheDocument()
  })

  it('renders Layout component with navigation', async () => {
    const { Layout } = await import('../components/Layout')
    
    render(
      <TestWrapper>
        <Layout showNavigation={true} studentName="Test" studentId="test">
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    )
    
    // Layout should render the content
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})

describe('Utility Imports', () => {
  it('imports expression utilities', async () => {
    const { evaluateString, simplifyString } = await import('../utils/expression')
    expect(evaluateString).toBeDefined()
    expect(simplifyString).toBeDefined()
    
    // Test basic functionality
    expect(evaluateString('2 + 2')).toBe(4)
  })

  it('imports voxel utilities', async () => {
    const utils = await import('../utils/voxel')
    expect(utils.generateRandomFigure).toBeDefined()
    expect(utils.renderIsometric).toBeDefined()
    expect(utils.createFigure).toBeDefined()
    expect(utils.L_SHAPE).toBeDefined()
  })

  it('imports geometry utilities', async () => {
    const { computeTriangle, computePolygon, generateTriangleSVG, generatePolygonSVG } = await import('../utils/geometry')
    expect(computeTriangle).toBeDefined()
    expect(computePolygon).toBeDefined()
    expect(generateTriangleSVG).toBeDefined()
    expect(generatePolygonSVG).toBeDefined()
  })

  it('imports latex utilities', async () => {
    const { parseLatexToStructure } = await import('../utils/latexParser')
    expect(parseLatexToStructure).toBeDefined()
  })

  it('imports yaml parser', async () => {
    const { parseTaskYaml } = await import('../utils/yamlTaskParser')
    expect(parseTaskYaml).toBeDefined()
  })

  it('imports task category utilities', async () => {
    const { getCategoryFromType, CATEGORIES } = await import('../utils/taskCategory')
    expect(getCategoryFromType).toBeDefined()
    expect(CATEGORIES).toBeDefined()
  })
})

