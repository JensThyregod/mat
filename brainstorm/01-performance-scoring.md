# Performance Scoring -- Two-Layer Architecture

> Back to [Overview](00-overview.md)

## The Design

We use a **two-layer architecture** that decouples the algorithm's needs from the user's experience:

1. **Internal layer:** A Beta distribution per skill, updated with asymmetric difficulty-weighted evidence and capped via evidence windowing. This drives the recommendation algorithm.
2. **Display layer:** The Beta mean is mapped to a human-friendly format for the user -- mastery levels, Danish grades, or progress bars.

The algorithm never sees the display score. The user never sees the raw distribution. Each layer is optimized for its purpose.

---

## Internal Layer: Beta Distributions

For each skill, we maintain a **Beta distribution** Beta(α, β) representing our belief about the user's mastery probability:

- **α** (alpha) -- evidence of mastery (correct answers, weighted by difficulty)
- **β** (beta) -- evidence of non-mastery (incorrect answers, weighted by difficulty)
- **Mean** = α / (α + β) -- the expected mastery probability (0 to 1)
- **Variance** = (α · β) / ((α + β)² · (α + β + 1)) -- how uncertain we are

```
                                                    ┌──────────────┐
                                                ┌──►│ Danish Grade  │
                                                │   └──────────────┘
┌──────────────────┐    ┌───────────────────┐   │   ┌──────────────┐
│ User Answers Task│───►│ Update Beta Dist. │───┤──►│ Mastery Level│
└──────────────────┘    └──┬────────────┬───┘   │   └──────────────┘
                           │            │       │   ┌──────────────┐
                           ▼            ▼       └──►│ Progress Bar │
                  ┌──────────────┐ ┌──────────┐     └──────────────┘
                  │Mean=α/(α+β)  │ │Uncertainty│
                  └──────┬───────┘ └─────┬────┘
                         │               │
                         ▼               ▼
                  ┌──────────────┐ ┌─────────────────────────┐
                  │Map to Display│ │Feed Uncertainty          │
                  │   Score      │ │  to Recommender          │
                  └──────────────┘ └─────────────────────────┘
```

### New User Prior

Every skill starts at **Beta(1, 1)** -- a uniform distribution meaning "we know nothing." This is mathematically honest. The display layer interprets this as a neutral starting state (see [Onboarding](02-onboarding-and-ux.md)), not as zero.

### Updating the Score

When a user answers a task tagged with skill S, we use **asymmetric difficulty weighting** inspired by Item Response Theory. The intuition: a surprising result (getting an easy question wrong, or a hard question right) is stronger evidence than an expected result.

- **Correct:** α_S += w_correct(difficulty)
- **Incorrect:** β_S += w_incorrect(difficulty)

Where the weights are asymmetric:

| Outcome | Easy Task | Hard Task |
|---------|-----------|-----------|
| Correct | Low weight (expected) | High weight (strong signal of mastery) |
| Incorrect | High weight (surprising, strong signal of weakness) | Low weight (expected) |

See [Adaptive Algorithm -- Asymmetric Difficulty Weights](03-adaptive-algorithm.md#step-5-update-after-answer) for the full formula.

For tasks that test **multiple skills**, the evidence weight is distributed using primary/secondary weighting: the primary skill receives 70% of the weight, and secondary skills split the remaining 30%. This keeps the main concept's signal strong while still updating related skills. See [Adaptive Algorithm -- Multi-Skill Tasks](03-adaptive-algorithm.md#multi-skill-tasks) for details.

After each update, the total evidence (α + β) is capped via rescaling to prevent old history from drowning out recent performance. This ensures a student who improves is never "hard stuck" by past mistakes. See [Adaptive Algorithm -- Evidence Windowing](03-adaptive-algorithm.md#preventing-hard-stuck----evidence-windowing) for details.

### Why Beta Distributions?

- **Handles uncertainty naturally** -- a user with 1 correct answer is not "100% mastered"; the wide distribution reflects our ignorance.
- **Conjugate prior** -- updating with new evidence is a simple addition, no complex recomputation.
- **Feeds the recommender** -- the variance tells the algorithm which skills to explore (high uncertainty) vs. exploit (low uncertainty, low mean).
- **Supports difficulty weighting** -- hard tasks contribute more evidence than easy ones.

---

## Display Layer: What the User Sees

The Beta mean (0 to 1) is mapped to a user-facing representation. We support multiple display formats, selectable or combinable:

### Mastery Levels (Primary Display)

Named tiers with a progress bar within each level. This is the default because it feels game-like and encouraging.

**Important:** Skills with fewer than `min_attempts` (e.g. 3-5) attempts are displayed as **"Not Yet Assessed"** regardless of their internal mean. This prevents the misleading situation where a brand-new skill at Beta(1,1) (mean = 0.5) would show as "Developing" despite having zero real data. The "Not Yet Assessed" state uses the neutral grey visual described in [Onboarding -- Visual Design Principles](02-onboarding-and-ux.md#use-warm-neutral-defaults).

| Condition | Mastery Level | Visual |
|-----------|---------------|--------|
| total_attempts < min_attempts | Not Yet Assessed | Soft grey node |

Once a skill has enough data (`total_attempts >= min_attempts`), the internal mean maps to these levels:

| Internal Mean | Mastery Level | Visual |
|---------------|---------------|--------|
| 0.00 -- 0.15 | Not Started | Empty node |
| 0.15 -- 0.35 | Beginning | 1/4 filled |
| 0.35 -- 0.55 | Developing | 2/4 filled |
| 0.55 -- 0.75 | Competent | 3/4 filled |
| 0.75 -- 0.90 | Proficient | Nearly full |
| 0.90 -- 1.00 | Mastered | Full + glow |

"Developing" feels much better than "35%." Leveling up from Developing to Competent is a concrete, celebratable milestone.

### Danish Grades (Optional Secondary Display)

Familiar to the Danish target audience. Shown alongside mastery levels if the user opts in.

| Internal Mean | Danish Grade |
|---------------|-------------|
| 0.00 -- 0.15 | -3 |
| 0.15 -- 0.30 | 00 |
| 0.30 -- 0.45 | 02 |
| 0.45 -- 0.60 | 4 |
| 0.60 -- 0.75 | 7 |
| 0.75 -- 0.90 | 10 |
| 0.90 -- 1.00 | 12 |

### Progress Bar Within Level

A continuous bar showing progress toward the next mastery level. Gives fine-grained feedback without exposing raw numbers. The user sees "Developing -- 60% to Competent" rather than "internal mean: 0.47."

---

## Why This Architecture?

The two-layer split gives us three key advantages:

1. **Algorithm independence** -- The recommender works with continuous Beta distributions regardless of what the user sees. We can change the display format without touching the algorithm.
2. **UX flexibility** -- We can A/B test display formats (mastery levels vs. Danish grades vs. percentages), offer user preferences, or change the mapping thresholds -- all without affecting the scoring engine.
3. **Honest uncertainty** -- The internal model knows the difference between "probably weak" and "we don't know yet." The display layer can present both states in encouraging ways, but the algorithm makes different decisions for each.

---

## Further Reading

- Bayesian Knowledge Tracing: Corbett & Anderson (1995)
- Beta-Binomial model for skill assessment
- Item Response Theory (IRT) -- our asymmetric difficulty weighting is inspired by IRT's insight that surprising outcomes carry more information
