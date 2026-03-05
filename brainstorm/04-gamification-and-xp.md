# Gamification and XP -- Quantifying Growth

> Back to [Overview](00-overview.md)

## The Idea

The platform already tracks rich probabilistic data per skill via [Beta distributions](01-performance-scoring.md). Gamification should make that data *felt* -- turning abstract Bayesian updates into a tangible sense of progression. The core mechanic: **convert the difference between your prior and posterior into XP**, so every task you solve gives you a reward proportional to how much you actually learned.

This document covers:

1. **XP from Bayesian updates** -- deriving experience points from the prior→posterior shift
2. **Branch and sub-skill aggregation** -- rolling XP up through the DAG into Algebra, Geometry, and Statistics
3. **Progression systems** -- levels, milestones, and visual feedback
4. **Anti-gaming and fairness** -- ensuring the system rewards genuine learning

---

## XP from Prior→Posterior Shift

### The Core Formula

Every time a user answers a task, the Beta distribution for the relevant skill(s) shifts. We can quantify that shift and convert it to XP.

**KL divergence as information gain:**

The Kullback-Leibler divergence `KL(posterior || prior)` measures how much the distribution changed -- i.e. how much the system *learned* about the user from that single answer. This is a natural measure of "how informative was this task?"

```
function compute_xp(prior_alpha, prior_beta, posterior_alpha, posterior_beta):
    // KL divergence between two Beta distributions
    kl = KL_beta(posterior_alpha, posterior_beta, prior_alpha, prior_beta)

    // Scale to a human-friendly XP range
    // Typical KL values for single-answer updates: 0.001 to 0.15
    raw_xp = kl * XP_SCALE_FACTOR  // e.g. XP_SCALE_FACTOR = 1000

    // Floor: every answered task gives at least some XP (effort reward)
    // Ceiling: cap to prevent outlier spikes from onboarding
    return clamp(raw_xp, MIN_XP_PER_TASK, MAX_XP_PER_TASK)

// KL divergence for Beta distributions (closed form):
// KL(Beta(a1,b1) || Beta(a2,b2)) =
//   ln B(a2,b2) - ln B(a1,b1)
//   + (a1-a2) * ψ(a1) + (b1-b2) * ψ(b1)
//   + (a2-a1+b2-b1) * ψ(a1+b1)
//
// where B is the Beta function and ψ is the digamma function.
```

### Why KL Divergence?

- **Correct on a hard task when uncertain** → large distribution shift → lots of XP
- **Correct on an easy task when already mastered** → tiny shift → minimal XP
- **Incorrect on an easy task** → large shift (surprising!) → still meaningful XP (the system learned something, even if the outcome was negative)
- It naturally rewards working at your frontier, not grinding easy tasks

### Simplified Alternative: Mean-Shift XP

If KL divergence feels too heavy computationally or conceptually, a simpler proxy:

```
function compute_xp_simple(prior_alpha, prior_beta, posterior_alpha, posterior_beta):
    prior_mean = prior_alpha / (prior_alpha + prior_beta)
    posterior_mean = posterior_alpha / (posterior_alpha + posterior_beta)

    // Absolute shift in mean, scaled
    delta = abs(posterior_mean - prior_mean)
    raw_xp = delta * XP_SCALE_FACTOR  // e.g. XP_SCALE_FACTOR = 5000

    return clamp(raw_xp, MIN_XP_PER_TASK, MAX_XP_PER_TASK)
```

This is less theoretically elegant (it ignores variance changes) but is easy to explain to users: "You moved Fractions from 45% to 48% -- that's 15 XP!"

### Suggested XP Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `MIN_XP_PER_TASK` | 5 | Every attempt is rewarded -- effort matters |
| `MAX_XP_PER_TASK` | 100 | Prevents onboarding/diagnostic spikes from being absurd |
| `XP_SCALE_FACTOR` (KL) | 1000 | Tuned so typical frontier tasks yield 15-40 XP |
| `XP_SCALE_FACTOR` (mean-shift) | 5000 | Same target range via the simpler formula |

---

## Positive-Only XP: Rewarding Both Outcomes

XP should **always be non-negative**. Even an incorrect answer updates the system's belief (the posterior moved), and the student invested effort. The XP formula uses `abs(delta)` or unsigned KL divergence, so:

- **Correct answer:** XP comes from the upward shift in mastery belief
- **Incorrect answer:** XP comes from the information gained (the system now knows more about the student)

The framing matters: incorrect answers give XP because "you helped the system find where to focus next" -- not because failing is the same as succeeding. The XP amount will naturally be smaller for expected failures (incorrect on a hard task → small shift → small XP) and larger for surprising failures (incorrect on an easy task → large shift → more XP, but also a strong signal to revisit prerequisites).

This avoids the demoralizing pattern where a wrong answer *takes away* progress.

---

## Branch Aggregation: Algebra, Geometry, Statistics

### The Three Branches

The skill DAG naturally clusters into three major mathematical branches. Each skill node in the DAG belongs to exactly one branch:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MATHEMATICS                                  │
│                                                                      │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │     ALGEBRA       │  │    GEOMETRY      │  │   STATISTICS     │  │
│  │                   │  │                  │  │                  │  │
│  │  Linear Equations │  │  Angles          │  │  Mean/Median     │  │
│  │  Quadratics       │  │  Triangles       │  │  Probability     │  │
│  │  Polynomials      │  │  Circles         │  │  Distributions   │  │
│  │  Systems of Eq.   │  │  Area/Volume     │  │  Combinatorics   │  │
│  │  Inequalities     │  │  Coordinate Geom │  │  Hypothesis Test │  │
│  │  Functions        │  │  Trigonometry    │  │  Regression      │  │
│  │  ...              │  │  ...             │  │  ...             │  │
│  └───────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                      │
│  Shared foundations (Addition, Multiplication, Fractions, etc.)       │
│  contribute to all three branches proportionally.                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Skill→Branch Mapping

Every skill in the DAG carries a `branch` tag:

```
SkillNode {
    skill_id: string
    branch: "algebra" | "geometry" | "statistics" | "foundation"
    ...
}
```

**Foundation skills** (arithmetic, fractions, etc.) are shared prerequisites. Their XP is distributed across branches proportionally to how many downstream skills in each branch depend on them:

```
function distribute_foundation_xp(skill, xp_earned, dag):
    descendants = dag.all_descendants(skill)
    branch_counts = count_by_branch(descendants)  // e.g. {algebra: 12, geometry: 8, statistics: 5}
    total = sum(branch_counts.values())

    for branch, count in branch_counts:
        branch_xp[branch] += xp_earned * (count / total)
```

This means improving at Fractions gives you XP in all three branches, weighted by how much each branch depends on fractions.

### Branch-Level XP and Levels

Each branch accumulates XP independently, giving the user three parallel progression tracks:

```
┌──────────────────────────────────────────────────────────┐
│  YOUR PROGRESS                                            │
│                                                           │
│  📐 Algebra      Level 7   ████████████░░░░  2,340 XP    │
│  📏 Geometry     Level 4   ██████░░░░░░░░░░  1,120 XP    │
│  📊 Statistics   Level 3   ████░░░░░░░░░░░░    780 XP    │
│                                                           │
│  Overall         Level 5   ████████░░░░░░░░  4,240 XP    │
└──────────────────────────────────────────────────────────┘
```

**Level thresholds** (XP required per level, with gentle exponential scaling):

```
function xp_for_level(level):
    // Level 1: 0 XP, Level 2: 100 XP, Level 3: 220 XP, ...
    // Each level requires ~20% more XP than the previous
    if level <= 1: return 0
    return floor(100 * (1.2^(level - 2) - 1) / 0.2 + 100)
```

| Level | Cumulative XP | Approx. Tasks at Frontier |
|-------|--------------|--------------------------|
| 1 | 0 | 0 |
| 2 | 100 | ~4 |
| 3 | 220 | ~9 |
| 5 | 530 | ~20 |
| 10 | 1,600 | ~60 |
| 15 | 4,200 | ~160 |
| 20 | 10,000 | ~380 |

The curve is gentle enough that early levels come quickly (instant gratification) but later levels represent genuine sustained effort.

---

## Sub-Skill Drill-Down

Beyond the three branches, users should be able to drill into specific sub-fields and see their growth. The DAG already provides this hierarchy.

### Skill-Level XP Tracking

Every skill node accumulates its own XP from tasks that target it (as primary or secondary skill):

```
SkillXP {
    skill_id: string
    total_xp: int
    xp_history: list<{timestamp, xp_earned, task_id}>
}
```

### The Skill Tree as a Heat Map of Growth

The existing [skill tree visualization](02-onboarding-and-ux.md#the-skill-tree-as-a-map-not-a-report-card) can be enhanced with XP data:

- **Node size or glow intensity** scales with total XP earned in that skill
- **Edge thickness** shows how much XP flowed through that prerequisite path
- **Recent activity pulse** -- skills practiced in the last session glow brighter

```
  Skill Tree with XP Overlay:

         ┌─────────────────────────┐
         │ Addition (Lv 8, 1200 XP)│  ← large, bright node
         └──┬──────────────────┬───┘
            │                  │
            ▼                  ▼
  ┌──────────────────┐  ┌──────────────────────┐
  │Subtraction       │  │Multiplication        │
  │(Lv 6, 850 XP)   │  │(Lv 7, 980 XP)        │  ← medium nodes
  └────────┬─────────┘  └──┬───────────────────┘
           │                │
           ▼                ▼
  ┌──────────────────┐  ┌──────────────────┐
  │Neg. Numbers      │  │Fractions         │
  │(Lv 3, 340 XP)   │  │(Lv 2, 180 XP)   │  ← smaller, dimmer
  └──────────────────┘  └──────────────────┘
                              ↑
                        recently active: pulsing
```

### Branch Drill-Down View

Clicking on a branch (e.g. Algebra) expands to show all sub-skills within that branch, with their individual XP and levels:

```
┌──────────────────────────────────────────────────────────────┐
│  📐 ALGEBRA -- Level 7 (2,340 XP)                            │
│                                                               │
│  Sub-skills:                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Linear Equations    Lv 5  ██████████░░░  +120 XP today  │  │
│  │ Inequalities        Lv 3  ██████░░░░░░░  +45 XP today   │  │
│  │ Systems of Eq.      Lv 2  ████░░░░░░░░░  new!           │  │
│  │ Quadratics          Lv 1  ██░░░░░░░░░░░                 │  │
│  │ Polynomials         --    not yet assessed               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Recent growth: +165 XP today across 12 tasks                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Session Summary: Before vs. After

After each practice session, show a **before/after comparison** that makes growth tangible:

```
┌──────────────────────────────────────────────────────────────────┐
│  SESSION COMPLETE -- 18 tasks, 22 minutes                        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  XP Earned: +285                                           │  │
│  │                                                            │  │
│  │  📐 Algebra     +140 XP   Level 6 → Level 7 ★ LEVEL UP!  │  │
│  │  📏 Geometry    +85 XP                                     │  │
│  │  📊 Statistics  +60 XP                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Skills improved:                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Fractions       Developing → Competent    +95 XP          │  │
│  │  Linear Eq.      Beginning  → Developing   +72 XP          │  │
│  │  Neg. Numbers    Competent  (reinforced)   +38 XP          │  │
│  │  Division        Proficient (reviewed)     +15 XP          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Biggest win: Fractions leveled up! 🎯                           │
│  Streak: 5 days in a row                                         │
└──────────────────────────────────────────────────────────────────┘
```

### Historical Growth Charts

Users can view their XP accumulation over time per branch and per skill:

```
  Algebra XP over time:

  XP
  2400 │                                          ╱──
  2000 │                                    ╱────╱
  1600 │                              ╱────╱
  1200 │                        ╱────╱
   800 │                  ╱────╱
   400 │           ╱─────╱
     0 │──────────╱
       └──────────────────────────────────────────
         Week 1    Week 2    Week 3    Week 4
```

The slope of this curve is the user's **learning velocity** -- a powerful motivational signal. Steeper = faster growth.

---

## Milestones and Achievements

### Skill Milestones

Triggered by mastery level transitions (from [Performance Scoring](01-performance-scoring.md)):

| Milestone | Trigger | XP Bonus |
|-----------|---------|----------|
| First Steps | First skill reaches "Beginning" | 50 |
| Getting the Hang of It | First skill reaches "Developing" | 75 |
| Competent | First skill reaches "Competent" | 100 |
| Proficient | First skill reaches "Proficient" | 150 |
| Mastered! | First skill reaches "Mastered" | 250 |
| Branch Explorer | Earn XP in all three branches | 100 |
| Well-Rounded | Reach Level 3 in all three branches | 200 |
| Algebra Specialist | Reach Level 10 in Algebra | 300 |
| Geometry Specialist | Reach Level 10 in Geometry | 300 |
| Statistics Specialist | Reach Level 10 in Statistics | 300 |

### Streak and Consistency Rewards

| Milestone | Trigger | Reward |
|-----------|---------|--------|
| Daily Practice | Complete at least 5 tasks in a day | 1.2x XP multiplier for the session |
| 3-Day Streak | Practice 3 consecutive days | 25 bonus XP |
| 7-Day Streak | Practice 7 consecutive days | 100 bonus XP |
| 30-Day Streak | Practice 30 consecutive days | 500 bonus XP |
| Comeback | Return after 7+ days away and complete a session | 50 bonus XP ("Welcome back!") |

### Growth Milestones (Prior→Posterior)

These specifically celebrate the *magnitude of improvement*, tying directly to the Bayesian update theme:

| Milestone | Trigger | XP Bonus |
|-----------|---------|----------|
| Quick Learner | Improve a skill's mean by 0.15 in a single session | 75 |
| Breakthrough | Move a skill from below 0.40 to above 0.60 | 150 |
| From Zero to Hero | Move a skill from "Not Yet Assessed" to "Competent" in one week | 200 |
| Turnaround | Improve a skill that was declining (3+ wrong → 5+ right) | 100 |

---

## Integration with Existing Systems

### How XP Relates to Mastery Levels

XP and mastery levels measure different things and coexist:

- **Mastery level** (from [Performance Scoring](01-performance-scoring.md)) = "How well do you know this right now?" (current state, can go up or down)
- **XP** = "How much have you learned in total?" (cumulative, never decreases)

A student can have high XP but moderate mastery (they've practiced a lot but are working on hard material). Or low XP but high mastery in a specific skill (they aced the diagnostic test). Both are valid and tell different stories.

### How XP Interacts with the Recommender

XP is purely a **display-layer concept** -- it does not influence the [recommendation algorithm](03-adaptive-algorithm.md). The recommender still uses Beta distributions, Thompson Sampling, and gap detection. XP is computed *from* the same updates but never fed back into task selection.

This follows the same [two-layer philosophy](01-performance-scoring.md#why-this-architecture): the algorithm layer and the display layer are independent. We can redesign the XP system without touching the recommender.

### How XP Interacts with Evidence Windowing

[Evidence windowing](03-adaptive-algorithm.md#preventing-hard-stuck----evidence-windowing) rescales the Beta distribution to prevent hard-stuck states. This means the prior→posterior shift for XP is computed **before rescaling** -- the XP reflects the raw information gain from the answer, not the post-rescaling state. Otherwise, rescaling would artificially inflate XP by making every update look like a larger shift.

```
function process_answer(task, is_correct, user_state):
    skill = task.primary_skill

    // Snapshot the prior
    prior_alpha = user_state[skill].alpha
    prior_beta = user_state[skill].beta

    // Apply the Bayesian update (asymmetric weights, multi-skill)
    update_state(task, is_correct, user_state)

    // Compute XP from the raw update (before rescaling)
    posterior_alpha = user_state[skill].alpha
    posterior_beta = user_state[skill].beta
    xp = compute_xp(prior_alpha, prior_beta, posterior_alpha, posterior_beta)

    // Now rescale for the algorithm's benefit
    rescale_if_needed(user_state[skill], max_evidence=30)

    // Award XP
    award_xp(user_state, skill, xp)
```

---

## Anti-Gaming Considerations

### Why the System Is Naturally Resistant

The XP formula based on prior→posterior shift has a built-in anti-gaming property: **grinding easy tasks gives almost no XP**. If you're already at Beta(20, 3) for Addition and you answer another easy Addition problem correctly, the posterior barely moves -- so the XP is near the minimum floor. The system rewards working at your frontier, not farming mastered skills.

### Remaining Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Deliberately answering wrong to lower mastery, then answering right for a bigger shift | The XP from the wrong answers is small (expected failure → small shift). The net XP from wrong-then-right is less than just answering right at frontier. Not profitable. |
| Creating multiple accounts to replay the high-XP onboarding phase | Tie accounts to school/email. XP is personal progress, not a leaderboard -- there's no competitive incentive to cheat. |
| Speed-running easy tasks for the MIN_XP floor | MIN_XP is small (5 XP). At ~25 XP per frontier task, grinding easy tasks is 5x slower for XP accumulation. |

---

## Summary

| Concept | Mechanism |
|---------|-----------|
| **XP source** | KL divergence (or mean-shift) between prior and posterior Beta distributions |
| **Always positive** | Effort is always rewarded; incorrect answers still earn XP from information gain |
| **Branch aggregation** | XP rolls up into Algebra, Geometry, Statistics via DAG branch tags |
| **Foundation skills** | XP distributed proportionally across branches by downstream dependency count |
| **Sub-skill visibility** | Every DAG node has its own XP total; drill-down views show per-skill growth |
| **Session summaries** | Before/after comparison showing mastery changes, XP earned, level-ups |
| **Growth charts** | Historical XP curves per branch and per skill; slope = learning velocity |
| **Milestones** | Mastery transitions, streaks, and growth-magnitude achievements award bonus XP |
| **Algorithm independence** | XP is display-layer only; does not influence the recommender |
| **Anti-gaming** | Prior→posterior XP naturally rewards frontier work over grinding |

The key insight: by grounding XP in the actual Bayesian update, we don't need to invent an arbitrary point system. The math *is* the game. Every task you solve literally moves your probability distribution, and the XP is a direct, honest reflection of how much the system's belief about you changed. That makes progress feel real, because it *is* real.

---

## Further Reading

- KL divergence for Beta distributions: closed-form via the Beta function and digamma function
- [Performance Scoring](01-performance-scoring.md) -- the two-layer architecture that XP builds on
- [Adaptive Algorithm](03-adaptive-algorithm.md) -- the recommendation engine that XP does *not* influence
- [Onboarding and UX](02-onboarding-and-ux.md) -- visual design principles that apply to XP displays
