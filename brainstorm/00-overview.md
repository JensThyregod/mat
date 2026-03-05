# Math Training Platform -- Brainstorm Overview

## What Is This?

A math training platform where users solve tasks to build and strengthen their mathematical skills. The platform adapts to each user, serving tasks that target their specific weaknesses and push them toward mastery.

## Core Goals

1. **Tailored tasks** -- The platform selects tasks based on what the user actually needs to practice, not a fixed curriculum. A skill dependency graph (DAG) encodes which skills build on which, and the system uses this structure to find gaps in understanding.

2. **Visual performance feedback** -- Users can see where they stand across all skills. The visualization should feel motivating, emphasizing growth and unlocked capabilities rather than deficiencies.

## System Architecture (Conceptual)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CORE DATA MODEL                              │
│   ┌────────────┐    ┌────────────┐    ┌──────────────────┐         │
│   │  Skill DAG │    │  Task Bank │    │  User Skill State│         │
│   └─────┬──────┘    └─────┬──────┘    └───┬──────────┬───┘         │
│         │                 │               │          │              │
└─────────┼─────────────────┼───────────────┼──────────┼──────────────┘
          │                 │               │          │
          ▼                 │               ▼          │
┌─────────────────────────────────────────────────┐    │
│              TASK RECOMMENDER                    │    │
│   ┌───────────────────┐                         │    │
│   │ Frontier Detection│                         │    │
│   └────────┬──────────┘                         │    │
│            ▼                                    │    │
│   ┌───────────────────┐                         │    │
│   │   Gap Analysis    │                         │    │
│   └────────┬──────────┘                         │    │
│            ▼                                    │    │
│   ┌───────────────────┐  ◄── Task Bank          │    │
│   │   Task Sampler    │                         │    │
│   └────────┬──────────┘                         │    │
└────────────┼────────────────────────────────────┘    │
             │                                         │
             ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SCORING ENGINE                                │
│   ┌──────────────────────┐         ┌───────────────┐               │
│   │ Internal Score/Skill │ ──────► │ Display Score  │               │
│   └──────────────────────┘         └───────┬───────┘               │
└────────────────────────────────────────────┼────────────────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      USER-FACING LAYER                              │
│   ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐    │
│   │ Task Interface │  │ Skill Tree Viz │  │ Progress Dashboard│    │
│   └───────┬────────┘  └────────────────┘  └───────────────────┘    │
│           │                                                         │
│           │  answer result                                          │
│           └──────────────────────► User Skill State (updates)       │
└─────────────────────────────────────────────────────────────────────┘
```

## How the Pieces Fit Together

1. The **Skill DAG** defines the structure of mathematical knowledge -- what depends on what.
2. Each user has an **internal skill state** (a probabilistic estimate of mastery per skill).
3. The **recommender** reads the DAG and user state to find the *frontier* -- skills where prerequisites are solid but the skill itself needs work. It then samples appropriate tasks.
4. The user solves tasks, and their answers update the internal skill state.
5. The **scoring engine** maps internal Beta distribution estimates to a human-friendly display format (mastery levels, Danish grades, or progress bars -- see [Performance Scoring](01-performance-scoring.md)). Skills with too few attempts show as "Not Yet Assessed" rather than a potentially misleading mastery level.
6. The **visualization layer** renders the skill tree and progress in a way that feels encouraging.

## Design Documents

| Topic | Status | Document |
|---|---|---|
| Performance scoring (two-layer: Beta distributions + display mapping) | **Decided** | [01 -- Performance Scoring](01-performance-scoring.md) |
| Onboarding, cold-start, and motivation | Design | [02 -- Onboarding and UX](02-onboarding-and-ux.md) |
| DAG-aware adaptive task recommendation | Design | [03 -- Adaptive Algorithm](03-adaptive-algorithm.md) |
| Gamification, XP, and growth quantification | Design | [04 -- Gamification and XP](04-gamification-and-xp.md) |

## Open Questions and Decision Log

- [ ] What math topics / grade levels do we target at launch?
- [ ] How large is the initial task bank per skill?
- [ ] Do we support multiple task types (multiple choice, free input, step-by-step)?
- [ ] Is there a social / classroom dimension (teachers viewing student progress)?
- [x] How do we handle skills that span multiple DAG nodes? → Split evidence equally across tagged skills. See [Adaptive Algorithm -- Multi-Skill Tasks](03-adaptive-algorithm.md#multi-skill-tasks).
- [ ] What is the tech stack? (This brainstorm is deliberately stack-agnostic.)
