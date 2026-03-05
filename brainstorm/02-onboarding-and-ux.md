# Onboarding and UX -- Where Does the User Start?

> Back to [Overview](00-overview.md)

## The Cold-Start Problem

We've decided on a [two-layer scoring architecture](01-performance-scoring.md): Beta distributions internally, mastery levels for display. A brand new user has no history -- every skill starts at Beta(1,1), total uncertainty. We face two challenges:

1. **Algorithmic:** The recommender has no signal. It doesn't know if the user is a 5th grader struggling with fractions or a university student brushing up on calculus.
2. **Emotional:** The user opens the platform and sees... what? A blank skill tree? All skills at "Not Started"? That's demoralizing before they've even begun.

Both problems need solving, and the solutions are intertwined.

---

## Strategy 1: Diagnostic Placement Test

### The Idea

When a user first arrives, run a short adaptive quiz (8-15 questions) that efficiently locates their level in the skill DAG. This simultaneously solves the algorithmic cold-start (we get real data fast) and the emotional cold-start (the user immediately has a populated skill map).

### How It Works with the DAG

The DAG is not a linear sequence -- it branches heavily (e.g. Fractions leads to Decimals, Ratios, and Percentages simultaneously). A simple binary search doesn't work because "move up" could mean any of several branches. Instead, we use an **information-gain approach** that picks the most informative question at each step.

```
  ┌──────────────────────────────────────┐
  │ Start: all skills at Beta(1,1)       │
  │ Pick skill with highest info gain    │
  │ (mid-depth, many descendants)        │
  └────────────────┬─────────────────────┘
                   ▼
          ┌────────────────┐
          │ Ask a Question │
          └───┬────────┬───┘
              │        │
        Correct        Incorrect
              │        │
              ▼        ▼
  ┌───────────────┐ ┌──────────────────────┐
  │ Update skill  │ │ Update skill         │
  │ + propagate   │ │ + propagate          │
  │ warm priors   │ │ cool priors          │
  │ DOWN the DAG  │ │ UP the DAG           │
  └───────┬───────┘ └──────────┬───────────┘
          └──────┬─────────────┘
                 ▼
  ┌──────────────────────────────────────┐
  │ Recompute info gain for all          │
  │ untested skills; pick the best one   │
  │ (highest uncertainty × most          │
  │  descendants affected)               │
  └────────────────┬─────────────────────┘
                   ▼
  ┌──────────────────────────────────────┐
  │ Repeat until budget exhausted        │
  │ (~10 questions)                      │
  └────────────────┬─────────────────────┘
                   ▼
  ┌──────────────────────────────────────┐
  │ Populate Skill Map                   │
  └──────────────────────────────────────┘
```

**The information-gain algorithm:**

1. Start with all skills at Beta(1,1). Compute an **information score** for each skill: `info(skill) = uncertainty(skill) × (1 + num_descendants(skill))`. Skills with high uncertainty *and* many downstream dependents are the most valuable to test -- one answer tells us about the whole subtree.
2. Ask a question for the highest-scoring skill.
3. Update that skill's Beta distribution from the answer.
4. **Propagate priors through the DAG (distance-attenuated):**
   - If **correct:** set warm priors on all *ancestors* (prerequisites) that haven't been directly tested -- if you can do Fractions, you probably know Multiplication. The prior strength decays with distance: `Beta(1 + 2 × 0.6^distance, 1)`. Immediate parents get Beta(2.2, 1), grandparents get Beta(1.72, 1), and so on. This prevents a single correct answer from making sweeping assumptions about distant ancestors.
   - If **incorrect:** set cool priors on all *descendants* (dependent skills) that haven't been directly tested -- if you can't do Fractions, you probably can't do Linear Equations. Same decay: `Beta(1, 1 + 1 × 0.6^distance)`. Immediate children get Beta(1, 1.6), grandchildren get Beta(1, 1.36), etc.
   - Directly tested skills are never overwritten by propagation.
5. Recompute information scores (propagated skills now have lower uncertainty, so the algorithm naturally moves to unexplored branches).
6. Repeat until the question budget is exhausted.

This handles branching naturally: after testing Fractions (which has 3+ branches above it), the algorithm might jump to Negative Numbers (a completely separate branch) because that's where the remaining uncertainty is highest. It doesn't get stuck traversing one path.

After the quiz, unanswered skills that weren't reached by propagation stay at Beta(1, 1) -- the system will explore them during normal practice.

### UX Framing

Don't call it a "test." Frame it as:
- "Let's see what you already know!" (discovery, not evaluation)
- "Help us personalize your experience" (they're in control)
- Show a progress bar: "Question 4 of 12"
- After completion: "Great! Here's your skill map -- look at everything you already know!"

### Pros

- Fast and efficient -- each question is chosen to maximize information, naturally handling the DAG's branching structure
- Gives real data, not assumptions
- The user feels productive immediately
- The skill map lights up with known skills -- encouraging first impression

### Cons

- Adds friction before the user can "just start"
- Some users may find even a short test anxiety-inducing
- Requires a well-curated set of diagnostic questions per skill

---

## Strategy 2: Grade-Level Baseline

### The Idea

Ask the user a single question: "What grade are you in?" or "What level are you studying?" Then set priors based on what's typically mastered at that level.

### How It Works

- A 7th grader gets warm priors on arithmetic, basic fractions, simple geometry
- A 10th grader gets warm priors on those plus algebra, functions, basic trigonometry
- The priors are not certainties -- they're just Beta(3, 1) instead of Beta(1, 1), meaning "probably known but we'll verify"

### Pros

- Zero friction -- one dropdown and you're in
- Reasonable starting point for most users
- The skill map immediately shows "expected" mastery, which feels good

### Cons

- Assumes the user matches their grade level (many don't -- that's often why they're here)
- Could set up false expectations ("It says I know fractions but I don't")
- Less data for the algorithm than a diagnostic test

---

## Strategy 3: Warm Default + Progressive Discovery

### The Idea

Skip any upfront assessment. Start everyone with a neutral-warm state and let the system learn from their first few real tasks.

### How It Works

- All skills start at Beta(1, 1) (unknown)
- The recommender picks a reasonable starting skill (configurable, or based on a single "what are you working on?" question)
- As the user solves tasks, the system rapidly updates and the skill map fills in
- The first 10-20 tasks are implicitly diagnostic -- the system is learning while the user is practicing

### UX Framing

- "Pick a topic to start with" (user agency)
- The skill map starts mostly grey/neutral ("Not Yet Assessed" state, not red/empty)
- As they practice, nodes transition through mastery levels: "You've reached Developing in Fractions!"

### Pros

- Zero friction, zero anxiety
- The user is "doing math" from second one, not taking a test
- Feels organic and game-like

### Cons

- The first few task recommendations may be poorly calibrated (too easy or too hard)
- Takes longer to build an accurate skill profile
- The initial skill map is mostly blank, which could feel empty

---

## Recommended Approach: Hybrid

Combine the strategies based on user preference:

```
                ┌──────────────┐
                │ User Arrives │
                └──────┬───────┘
                       ▼
          ┌────────────────────────┐
          │ How do you want to     │
          │ start?                 │
          └─────┬──────────┬──────┘
                │          │
         Quick Start    Find My Level
                │          │
                ▼          ▼
  ┌──────────────────┐  ┌──────────────────────────┐
  │ Pick a topic,    │  │ Short adaptive quiz       │
  │ start solving    │  │ (10 questions)            │
  └────────┬─────────┘  └────────────┬─────────────┘
           │                         │
           ▼                         ▼
  ┌──────────────────┐  ┌──────────────────────────┐
  │ First tasks are  │  │ Skill map populated      │
  │ implicitly       │  │ from results             │
  │ diagnostic       │  └────────────┬─────────────┘
  └────────┬─────────┘               │
           └───────────┬─────────────┘
                       ▼
            ┌─────────────────────┐
            │ System learns       │
            │ rapidly             │
            └──────────┬──────────┘
                       ▼
            ┌─────────────────────┐
            │ Fully personalized  │
            │ experience          │
            └─────────────────────┘
```

1. **Offer a choice** on first visit: "Jump right in" or "Find my level first"
2. Users who choose "Jump right in" get the warm-default experience with implicit diagnosis
3. Users who choose "Find my level" get the short adaptive placement test
4. Both paths converge on a personalized experience within 10-15 interactions

This respects different user preferences (some want structure, some want to dive in) while solving the cold-start problem either way.

---

## Visual Design Principles

### Show What's Unlocked, Not What's Missing

Bad: A skill tree where 80% of nodes are greyed out and locked.
Good: A skill tree where known nodes glow and pulse, with gentle paths leading to the next frontier.

### Use Warm, Neutral Defaults

- Unknown skills should be **neutral** (soft grey), not **negative** (red, locked, zero)
- The absence of data is not the same as failure
- As the user practices, nodes transition from grey to colored -- this feels like painting a canvas, not filling holes

### Progress-Forward Framing

Instead of showing current state as a static snapshot, emphasize **movement**:

- "You've improved in 3 skills this week"
- "You're 2 tasks away from leveling up in Fractions"
- "Your streak: 5 days in a row"
- Show a "recently improved" section prominently

### The Skill Tree as a Map, Not a Report Card

The skill tree visualization should feel like an **adventure map**, not a grade sheet:

- Mastered skills are vibrant, "explored" territory
- The frontier glows invitingly -- "here's where you're headed"
- Future skills are visible but soft -- aspirational, not intimidating
- Connections (edges) between skills tell a story: "Fractions lead to Algebra"

### Celebrate Small Wins

- Level-up animations when a skill crosses a mastery threshold
- "First correct answer in Equations!" moments
- Weekly summary: "This week you practiced 47 tasks and improved in Geometry"

---

## Handling Discouragement

### What If a User Is Struggling?

- Never show a skill going "backward" in a dramatic way. If incorrect answers lower a score, the visual change should be subtle.
- Frame setbacks as normal: "Fractions is a tough one -- let's try a few more practice problems"
- Offer to drop down to prerequisites automatically: "Want to warm up with some basics first?"
- Difficulty adjustment: if a user gets 3+ wrong in a row, serve easier tasks within the same skill

### What If a User Is Far Behind Their Grade Level?

- The diagnostic test handles this gracefully -- it finds their actual level without judgment
- The skill map shows what they *do* know, not what they "should" know
- No reference to grade-level expectations in the UI -- it's about *their* journey

---

## Summary

| Strategy | Friction | Data Quality | Emotional Impact |
|----------|----------|-------------|-----------------|
| Diagnostic Test | Medium (2-3 min) | High | Positive if framed well |
| Grade Baseline | Very Low | Low-Medium | Neutral |
| Warm Default | Zero | Low initially | Neutral to Positive |
| **Hybrid (recommended)** | **User's choice** | **High** | **Positive** |

The hybrid approach lets users self-select their onboarding style while ensuring the system converges on accurate skill profiles quickly regardless of path.
