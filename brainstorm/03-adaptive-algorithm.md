# Adaptive Algorithm -- DAG-Aware Task Recommendation

> Back to [Overview](00-overview.md)

## The Problem

We've decided on a [two-layer scoring architecture](01-performance-scoring.md) where each skill is tracked by a Beta distribution. Given a user with partial mastery across a graph of interdependent skills, **which task should we serve next?** The answer should:

1. Target skills where the user has gaps
2. Respect prerequisites -- don't drill calculus if algebra is shaky
3. Balance drilling known weaknesses vs. exploring uncertain skills
4. Occasionally revisit mastered skills to keep them sharp
5. Keep the user in the "zone of proximal development" -- challenged but not overwhelmed

---

## The Skill DAG

### Structure

The skill DAG (Directed Acyclic Graph) is the backbone of the system. Each node is a **skill** (a learnable concept), and each directed edge means "A is a prerequisite for B."

```
                          ┌──────────┐
                          │ Addition │
                          └──┬───┬───┘
                             │   │
                ┌────────────┘   └────────────┐
                ▼                              ▼
        ┌──────────────┐              ┌─────────────┐
        │ Subtraction  │              │Multiplication│
        └──────┬───────┘              └──┬───────┬──┘
               │                         │       │
               ▼                         ▼       │
     ┌──────────────────┐          ┌──────────┐  │
     │ Negative Numbers │          │ Division │  │
     └────────┬─────────┘          └─────┬────┘  │
              │                          │       │
              │                          ▼       ▼
              │                      ┌────────────┐
              │                      │ Fractions  │
              │                      └─┬────┬───┬─┘
              │                        │    │   │
              │            ┌───────────┘    │   └──────────┐
              │            ▼                │              ▼
              │     ┌──────────┐            │       ┌──────────┐
              │     │ Decimals │            │       │  Ratios  │
              │     └────┬─────┘            │       └────┬─────┘
              │          │                  │            │
              │          └──────┬───────────┼────────────┘
              │                 ▼           │
              │          ┌─────────────┐    │
              │          │ Percentages │    │
              │          └──────┬──────┘    │
              │                 │           │
              │                 ▼           ▼
              │      ┌─────────────────┐  ┌──────────────────┐
              │      │Basic Statistics │  │ Linear Equations │◄──┐
              │      └───────┬─────────┘  └──┬───────────┬───┘   │
              │              │               │           │        │
              └──────────────┼───────────────┼───────────┘────────┘
                             │               │           │
                             ▼               ▼           ▼
                     ┌─────────────┐ ┌────────────┐ ┌──────────────┐
                     │ Probability │ │ Systems of │ │ Inequalities │
                     └─────────────┘ │ Equations  │ └──────┬───────┘
                                     └──────┬─────┘        │
                                            └──────┬───────┘
                                                   ▼
                                          ┌────────────────────┐
                                          │Quadratic Equations │
                                          └────────┬───────────┘
                                                   ▼
                                            ┌─────────────┐
                                            │ Polynomials │
                                            └──────┬──────┘
                                                   ▼
                                          ┌──────────────────┐
                                          │ Intro to Calculus│
                                          └──────────────────┘
```

### Properties

- **Roots** (no prerequisites): Addition, counting, number recognition -- the foundational skills
- **Leaves** (no dependents): Advanced topics like calculus, probability
- **Depth** of a node: longest path from any root (indicates how "advanced" a skill is)
- **Width** at a depth level: how many parallel skills exist (indicates breadth of the curriculum)

### Per-Skill State

For each user-skill pair, we store:

```
SkillState {
    skill_id: string
    alpha: float            // Beta distribution parameter (evidence of mastery)
    beta: float             // Beta distribution parameter (evidence of non-mastery)
    last_practiced: timestamp
    total_attempts: int
    review_interval: duration   // Current spaced repetition interval (starts at 1 day on mastery)
    next_review_at: timestamp   // When this skill is next due for review (null if not yet mastered)
}
```

The **mastery estimate** is: mean = alpha / (alpha + beta)

The **uncertainty** is: variance = (alpha * beta) / ((alpha + beta)^2 * (alpha + beta + 1))

High uncertainty means we don't have enough data to be confident about this skill.

---

## Core Concepts

### 1. The Frontier

The **frontier** is the set of skills where:
- All prerequisite skills are sufficiently mastered (mean >= threshold, e.g. 0.6)
- The skill itself is NOT yet mastered (mean < mastery_threshold, e.g. 0.85)

This is the **zone of proximal development** -- the sweet spot where learning happens. The user has the foundation to tackle these skills but hasn't mastered them yet.

```
  ✅ = mastered (mean >= 0.85)    🔶 = frontier    ⬜ = not ready

         ┌───────────────────┐
         │ ✅ Addition (0.95) │
         └──┬────────────┬───┘
            │            │
            ▼            ▼
 ┌────────────────────┐  ┌──────────────────────────┐
 │✅ Subtraction (0.92)│  │✅ Multiplication (0.88)   │
 └─────────┬──────────┘  └──┬──────────────────┬────┘
           │                 │                  │
           ▼                 ▼                  │
 ┌─────────────────────────┐ ┌──────────────────┐
 │🔶 Negative Numbers (0.70)│ │✅ Division (0.82) │
 └─────────┬───────────────┘ └────────┬─────────┘
           │                          │
           │                          ▼
           │                ┌────────────────────┐
           │                │🔶 Fractions (0.45)  │
           │                └──┬──────────┬──┬───┘
           │                   │          │  │
           │                   ▼          ▼  │
           │      ┌──────────────────┐ ┌──────────────┐
           │      │⬜ Decimals (0.20) │ │⬜ Ratios (0.15)│
           │      └──────────────────┘ └──────────────┘
           │                             │
           └──────────┐                  │
                      ▼                  │
           ┌──────────────────────────┐  │
           │⬜ Linear Equations (0.10) │◄─┘
           └──────────────────────────┘
```

In this example, the frontier would be:
- **Fractions (0.45)** -- prerequisites (Multiplication 0.88, Division 0.82) are mastered, but Fractions itself is not
- **Negative Numbers (0.70)** -- prerequisite (Subtraction 0.92) is mastered, skill is developing but not yet mastered

Linear Equations (0.10) is NOT on the frontier because its prerequisite Fractions (0.45) is not yet mastered. Decimals and Ratios are also excluded because they depend on unmastered Fractions.

### 2. Gap Detection

When a user struggles with a frontier skill, we **walk backward** in the DAG to check if the real problem is a weak prerequisite.

**Algorithm:**

```
function detect_gaps(skill, user_state, dag):
    gaps = []
    if user_state[skill].mean < struggle_threshold:
        for prereq in dag.prerequisites(skill):
            if user_state[prereq].mean < struggle_threshold:
                gaps.append(prereq)
                gaps.extend(detect_gaps(prereq, user_state, dag))
    return gaps
```

The check uses `struggle_threshold` (default 0.40) for both the skill and its prerequisites, not `mastery_threshold`. This is deliberate: a prerequisite at 0.65 (above `prereq_threshold`, solidly "Competent") is good enough -- we don't want to endlessly redirect the user backward to perfect every prerequisite before letting them work on the frontier. Gap detection only fires when a prerequisite is genuinely weak (below `struggle_threshold`), indicating a real foundation problem rather than just incomplete mastery.

If a user is struggling with Linear Equations and we walk back to find Fractions is weak, we redirect them to Fractions first. This is the system's ability to **diagnose root causes**, not just symptoms.

### 3. Uncertainty as a Signal

A skill with high uncertainty (low total_attempts) is one we don't know much about. This is different from a skill we *know* is weak.

- **High mean, low uncertainty:** Mastered. Leave it alone (mostly).
- **Low mean, low uncertainty:** Confirmed weakness. Drill it.
- **Any mean, high uncertainty:** We don't know. Explore it.

This distinction drives the exploration/exploitation balance.

---

## The Recommendation Algorithm

### Overview

```
    ┌─────────────────────┐
    │  Select Next Task   │◄─────────────────────────────────┐
    └──────────┬──────────┘                                  │
               ▼                                             │
    ┌─────────────────────┐                                  │
    │ Review or New       │                                  │
    │ Learning?           │                                  │
    └────┬───────────┬────┘                                  │
         │           │                                       │
      Review     New Learning                                │
         │           │                                       │
         ▼           ▼                                       │
  ┌────────────┐ ┌─────────────────────┐                     │
  │ Select     │ │ Compute Frontier    │                     │
  │ Review Task│ │ Skills              │                     │
  └──────┬─────┘ └──────────┬──────────┘                     │
         │                  ▼                                │
         │       ┌─────────────────────┐                     │
         │       │ Check for Prereq.   │                     │
         │       │ Gaps                │                     │
         │       └────┬───────────┬────┘                     │
         │            │           │                          │
         │       Gaps found    No gaps                       │
         │            │           │                          │
         │            ▼           ▼                          │
         │   ┌──────────────┐ ┌─────────────────────┐       │
         │   │ Thompson     │ │ Thompson Sample     │       │
         │   │ Sample GAPS  │ │ FRONTIER            │       │
         │   │ (stage 1)    │ │ (stage 2)           │       │
         │   └──────┬───────┘ └──────────┬──────────┘       │
         │          └──────┬─────────────┘                   │
         │                 ▼                                 │
         │      ┌─────────────────────┐                      │
         │      │ Select Task for     │                      │
         │      │ Chosen Skill        │                      │
         │      └──────────┬──────────┘                      │
         │                 ▼                                 │
         │      ┌─────────────────────┐                      │
         │      │ Adjust Difficulty   │                      │
         │      └──────────┬──────────┘                      │
         └────────┬────────┘                                 │
                  ▼                                          │
    ┌─────────────────────┐                                  │
    │ Present Task to User│                                  │
    └──────────┬──────────┘                                  │
               ▼                                             │
    ┌─────────────────────┐                                  │
    │ User Answers        │                                  │
    └──────────┬──────────┘                                  │
               ▼                                             │
    ┌─────────────────────┐                                  │
    │ Update Beta Dist.   │                                  │
    │ (asymmetric weights,│                                  │
    │  evidence windowing) │                                  │
    └──────────┬──────────┘                                  │
               ▼                                             │
    ┌─────────────────────┐                                  │
    │ Recalibrate Task    │                                  │
    │ Difficulty Stats    │──────────────────────────────────┘
    └─────────────────────┘
```

### Step 1: Compute the Frontier

```
function compute_frontier(user_state, dag):
    frontier = []
    for skill in dag.all_skills():
        prereqs_mastered = all(
            user_state[p].mean >= prereq_threshold
            for p in dag.prerequisites(skill)
        )
        skill_not_mastered = user_state[skill].mean < mastery_threshold
        if prereqs_mastered and skill_not_mastered:
            frontier.append(skill)
    return frontier
```

If the frontier is empty (everything is mastered or nothing has mastered prerequisites), fall back to:
- If all mastered: pick the skill with the oldest `last_practiced` (spaced repetition)
- If no prerequisites met: start at DAG roots

### Step 2: Gap Detection

For each frontier skill, run the gap detection algorithm. If any prerequisite is below `struggle_threshold` (not `mastery_threshold` -- see the distinction in [Gap Detection](#2-gap-detection) above), add it to a "gap set."

### Step 3: Two-Stage Thompson Sampling

We use a **two-stage approach** to ensure prerequisite gaps are addressed before frontier skills:

1. **Stage 1 -- Gaps:** If gap detection found any weak prerequisites, Thompson Sample **only among the gap skills**. This guarantees the user fixes foundational problems before moving forward.
2. **Stage 2 -- Frontier:** If no gaps were found, Thompson Sample among the frontier skills.

This separation ensures gaps always take priority, rather than competing with frontier skills in the same sampling pool.

**Thompson Sampling for skill selection:**

```
function thompson_sample(candidate_skills, user_state):
    scores = {}
    for skill in candidate_skills:
        alpha = user_state[skill].alpha
        beta = user_state[skill].beta
        sampled_mastery = random_beta(alpha, beta)
        scores[skill] = 1 - sampled_mastery
    return argmax(scores)

function select_skill(gaps, frontier, user_state):
    if gaps is not empty:
        return thompson_sample(gaps, user_state)      // Stage 1
    else:
        return thompson_sample(frontier, user_state)   // Stage 2
```

**Why Thompson Sampling?**

- A skill with Beta(2, 8) (probably weak) will usually sample low values, so 1 - sample will be high -- we'll practice it often.
- A skill with Beta(1, 1) (unknown) has high variance -- sometimes it samples high, sometimes low. So we'll *occasionally* test it, which is exactly right for exploration.
- A skill with Beta(20, 2) (probably mastered) will almost always sample high, so 1 - sample will be low -- we'll rarely revisit it. But occasionally the sample will be lower, triggering a review.

This naturally handles the explore/exploit tradeoff without any tuning parameters.

**Why two stages instead of one pool?**

Mixing gaps and frontier skills in a single Thompson Sampling pool doesn't actually prioritize gaps -- it just treats them as equal candidates. A gap at Beta(4, 6) and a frontier skill at Beta(3, 7) would compete on equal footing, even though the gap is structurally more important (it's blocking progress on downstream skills). The two-stage approach guarantees that foundation problems are resolved first.

### Step 4: Select a Task and Adjust Difficulty

Once we've chosen a skill, pick a task from the task bank for that skill. Tasks should have a **difficulty rating** (e.g. 1-5 or a continuous scale).

**Difficulty selection heuristic:**

- Target a difficulty where the user has roughly a **70-80% chance of success**. This is the sweet spot for learning (challenging but achievable).
- Estimate success probability from the user's current mastery of the skill.
- If mastery mean is 0.4, serve easier tasks within the skill. If mastery mean is 0.7, serve harder ones.

```
function select_difficulty(skill, user_state, task_bank):
    mastery = user_state[skill].mean
    // Map mastery to target difficulty
    // Low mastery -> easy tasks, high mastery -> hard tasks
    target_difficulty = mastery * max_difficulty
    // Find the task closest to target difficulty (with some randomness)
    candidates = task_bank.get_tasks(skill, near_difficulty=target_difficulty)
    return random_choice(candidates)
```

### Step 5: Update After Answer

We use **asymmetric difficulty weighting** inspired by Item Response Theory. The core insight: a surprising outcome carries more information than an expected one. Getting an easy question wrong is more revealing than getting a hard question wrong.

**Asymmetric weight functions:**

```
function weight_correct(difficulty, max_difficulty):
    // Correct on hard task = strong signal; correct on easy task = weak signal
    return 0.5 + 0.5 * (difficulty / max_difficulty)

function weight_incorrect(difficulty, max_difficulty):
    // Incorrect on easy task = strong signal; incorrect on hard task = weak signal
    return 1.0 - 0.5 * (difficulty / max_difficulty)
```

| Outcome | Easy Task (d=1) | Medium Task (d=3) | Hard Task (d=5) |
|---------|-----------------|-------------------|-----------------|
| Correct | +0.6 to α | +0.8 to α | +1.0 to α |
| Incorrect | +1.0 to β | +0.8 to β | +0.6 to β |

This means:
- **Correct on hard task:** high positive weight (strong signal of mastery)
- **Correct on easy task:** low positive weight (expected, weak signal)
- **Incorrect on easy task:** high negative weight (surprising, strong signal of weakness)
- **Incorrect on hard task:** low negative weight (expected, weak signal)

**Update function:**

```
function update_state(task, is_correct, user_state):
    difficulty = task.difficulty
    if is_correct:
        weight = weight_correct(difficulty, max_difficulty)
    else:
        weight = weight_incorrect(difficulty, max_difficulty)

    // Primary/secondary evidence weighting
    primary_skill = task.primary_skill
    secondary_skills = task.secondary_skills
    primary_weight = weight * 0.7
    secondary_weight = weight * 0.3 / max(len(secondary_skills), 1)

    for skill in [primary_skill] + secondary_skills:
        skill_weight = primary_weight if skill == primary_skill else secondary_weight
        if is_correct:
            user_state[skill].alpha += skill_weight
        else:
            user_state[skill].beta += skill_weight
        user_state[skill].last_practiced = now()
        user_state[skill].total_attempts += 1

        // Prevent evidence from growing unbounded
        rescale_if_needed(user_state[skill], max_evidence=30)
```

For single-skill tasks (no secondary skills), the primary skill receives the full weight.

### Multi-Skill Tasks

Many real math problems test multiple skills simultaneously (e.g. a word problem requiring both fractions and geometry). We handle this with **primary/secondary evidence weighting**:

- Every task has a **primary skill** (the main concept being tested) and optional **secondary skills**
- The primary skill receives **70%** of the evidence weight
- Secondary skills split the remaining **30%** equally among themselves
- All tagged skills get their `last_practiced` and `total_attempts` updated
- For single-skill tasks, the primary skill receives the full weight

This keeps the primary skill's signal strong (so multi-skill tasks still meaningfully move the needle on the main concept) while acknowledging that secondary skills were also exercised. It also avoids penalizing skills that are primarily tested through multi-skill tasks -- under equal splitting, those skills would accumulate evidence ~3x slower.

**Task bank convention:** For recommendation purposes, the task is filed under its primary skill. For scoring purposes, all tagged skills are updated with the primary/secondary weighting.

---

## Preventing "Hard Stuck" -- Evidence Windowing

### The Problem with Raw Accumulation

The naive Beta update (just incrementing α and β forever) has a critical flaw: **old evidence drowns out new performance.** Consider a student who struggled with Fractions for 200 attempts and then suddenly "gets it" -- maybe they got tutoring, or something clicked. Their state might be Beta(15, 195), mean ≈ 0.07. Even if they now answer 10 in a row correctly, they'd reach Beta(25, 195), mean ≈ 0.11. The system still thinks they're terrible at Fractions, and it would take ~150 more correct answers just to reach 0.50.

This is unacceptable. A student who gets 10 out of their last 10 correct is clearly performing well *right now*, regardless of their history.

```
  The swamping problem:

  Student answers 200 questions wrong, then 10 right.

  Raw accumulation:
    Beta(11, 201) → mean = 0.052   ← System says: "still terrible"
    Reality:                        ← Student just got 10/10 correct!

  What we want:
    Recent performance should dominate.
    10/10 correct recently → system recognizes rapid improvement.
```

### Solution: Exponential Recency Weighting (Soft Window)

Instead of treating all historical evidence equally, we apply an **exponential decay to evidence age** so that recent answers carry more weight than old ones. This is implemented as a cap on the effective evidence (α + β) the distribution can accumulate, combined with a recency-weighted update.

**Effective evidence cap:**

We define a parameter `max_evidence` (e.g. 20-50) that limits how much total evidence the distribution can hold. When α + β exceeds this cap, we rescale:

```
function rescale_if_needed(skill_state, max_evidence=30):
    total = skill_state.alpha + skill_state.beta
    if total > max_evidence:
        scale = max_evidence / total
        skill_state.alpha = 1 + (skill_state.alpha - 1) * scale
        skill_state.beta  = 1 + (skill_state.beta - 1) * scale
```

Note: this rescaling is **prior-anchored**, not strictly mean-preserving. It preserves the distance from the Beta(1,1) prior rather than the raw α/β ratio, which introduces a slight pull toward 0.5 (the prior mean). This is intentionally a mild regularization -- it prevents extreme distributions and **limits the inertia** of the distribution. The distribution can never become so heavy that new evidence is meaningless.

With `max_evidence = 30`, the distribution always behaves as if it's based on roughly the last ~30 weighted observations. Old evidence is gradually "forgotten" as new evidence pushes it out.

**Revised update with rescaling:**

The full update logic (including asymmetric weights, multi-skill splitting, and rescaling) is defined in [Step 5: Update After Answer](#step-5-update-after-answer). The rescaling call happens at the end of every update.

### Why This Works

Let's revisit the "hard stuck" scenario with evidence capping at `max_evidence = 30`:

```
  Scenario: Student struggles, then improves.

  After 200 wrong answers (with rescaling active throughout):
    State is approximately Beta(1.5, 29.5) → mean ≈ 0.05
    (NOT Beta(1, 201) -- the cap prevents runaway accumulation)

  After 10 correct answers in a row:
    State moves toward Beta(11.5, 29.5) → mean ≈ 0.28
    Then after rescaling: roughly Beta(8.5, 22.5) → mean ≈ 0.27

  After 10 MORE correct answers:
    State approaches Beta(15, 16) → mean ≈ 0.48

  The student is visibly recovering! The system recognizes the turnaround
  within ~20 answers, not ~200.
```

Compare this to raw accumulation where the same student would need 150+ correct answers to reach 0.50. The evidence cap ensures the system is always responsive to the student's *current* ability.

### The Tradeoff

Evidence capping means the system has a **shorter memory**. A student who was genuinely mastered at a skill but stops practicing will lose that status faster than with raw accumulation. However, this is actually desirable:

1. **Quick recovery** -- if the student returns and demonstrates mastery again, the system recognizes it quickly.
2. **Responsiveness over stability** -- for a learning platform, it's better to be slightly too responsive than to trap students in outdated assessments.
3. **Review scheduling handles retention** -- rather than decaying scores over time, we use spaced repetition review tasks to verify that mastered skills are still solid (see [Review Scheduling](#review-scheduling) below).

### Tuning `max_evidence`

| max_evidence | Behavior | Best for |
|-------------|----------|----------|
| 15-20 | Very responsive, short memory. Recent ~15 answers dominate. | Younger students, skills that change rapidly |
| 25-35 | Balanced. Recent ~30 answers dominate but some history retained. | **Default recommendation** |
| 40-50 | More stable, longer memory. Takes more evidence to shift. | Advanced students, high-stakes assessments |

This parameter can be tuned per skill or per user profile. A struggling student might benefit from a lower cap (more responsive), while an advanced student might prefer a higher one (more stable).

---

## Spaced Repetition Review

Even mastered skills need occasional verification. Rather than applying time decay to scores (which would penalize students for taking breaks), we use **spaced repetition review tasks** as a secondary recommendation channel. Scores only change when the student actually answers a question -- never silently in the background.

### Review Scheduling

Reserve a fraction of task recommendations (e.g. 15-20%) for **review tasks**. When selecting a review task, pick from mastered skills that are due for review (i.e. `now() >= next_review_at`), prioritizing those most overdue.

**Review interval state machine:**

```
function handle_review_result(skill_state, is_correct):
    if is_correct:
        // Double the interval (up to a max of 60 days)
        skill_state.review_interval = min(skill_state.review_interval * 2.0, 60 days)
        skill_state.next_review_at = now() + skill_state.review_interval
    else:
        // Reset interval -- skill needs re-learning
        skill_state.review_interval = 1 day
        skill_state.next_review_at = now() + 1 day
        // The normal Beta update (asymmetric weights) handles the score change.
        // An easy review question answered incorrectly already carries high weight,
        // which will naturally push the skill back onto the frontier.
```

**Initial review state:** When a skill first crosses `mastery_threshold`, set `review_interval = 1 day` and `next_review_at = now() + 1 day`.

**Interval progression for consecutive correct reviews:** 1d → 2d → 4d → 8d → 16d → 32d → 60d (capped).

If no mastered skills are due for review when the system rolls a review slot, fall back to new learning instead of forcing a premature review.

This ensures mastered skills stay mastered while the bulk of practice time goes to the frontier. The key advantage over time decay: a student who takes a two-week vacation comes back to the same skill map they left, and the system verifies their knowledge through actual tasks rather than silently downgrading them.

---

## Task Difficulty Recalibration

### The Problem with Static Difficulty Ratings

Task difficulty is initially assigned by content authors, but human estimates are often wrong. A task labeled "difficulty 3" might be answered correctly by 95% of users, meaning it's effectively easy. Since our asymmetric weighting and difficulty-based task selection both depend on accurate difficulty ratings, miscalibrated tasks degrade the entire system.

### Solution: Track Per-Task Statistics

For each task, maintain running statistics:

```
TaskStats {
    task_id: string
    total_attempts: int
    total_correct: int
    success_rate: float              // total_correct / total_attempts (raw, for quick reference)
    avg_time_seconds: float          // average time to answer
    authored_difficulty: float       // original difficulty rating
    calibrated_difficulty: float     // adjusted difficulty based on skill-adjusted data
    attempts: list<TaskAttempt>      // per-attempt records for skill-adjusted recalibration
}

TaskAttempt {
    is_correct: bool
    user_mastery_at_time: float      // user's skill mean when they attempted this task
}
```

### Recalibration Logic

Once a task has sufficient data (e.g. `total_attempts >= 30`), recalibrate its difficulty based on a **skill-adjusted success rate**. Raw success rate is misleading because it depends on *who* attempts the task -- a task only attempted by advanced users will look artificially easy, while a task served via gap detection to struggling users will look artificially hard.

To correct for this, we weight each attempt by how surprising the outcome was given the user's mastery at the time:

```
TaskAttempt {
    is_correct: bool
    user_mastery_at_time: float  // user's skill mean when they attempted this task
}

function recalibrate(task_stats, max_difficulty):
    if task_stats.total_attempts < 30:
        return task_stats.authored_difficulty

    // Skill-adjusted success rate: weight each attempt by how informative it is.
    // A correct answer from a low-mastery user (surprising) counts more toward
    // "this task is easy." An incorrect answer from a high-mastery user (surprising)
    // counts more toward "this task is hard."
    adjusted_correct = 0
    adjusted_total = 0
    for attempt in task_stats.attempts:
        if attempt.is_correct:
            weight = 1 + (1 - attempt.user_mastery_at_time)  // range [1, 2]
        else:
            weight = 1 + attempt.user_mastery_at_time         // range [1, 2]
        adjusted_correct += attempt.is_correct * weight
        adjusted_total += weight
    adjusted_success_rate = adjusted_correct / adjusted_total

    // Map adjusted success rate to difficulty
    calibrated = (1 - adjusted_success_rate) * max_difficulty
    
    // Blend with authored difficulty to avoid wild swings
    // (80% data-driven, 20% authored as anchor)
    blend = 0.8 * calibrated + 0.2 * task_stats.authored_difficulty
    return clamp(blend, 1, max_difficulty)
```

The weighting ensures that a task attempted mostly by strong users isn't miscalibrated as "easy" just because they all got it right -- their high mastery is expected, so those correct answers carry less calibration weight. Conversely, correct answers from weaker users are a stronger signal that the task is genuinely easy.

### Why This Matters

- **Better task selection:** The system can more accurately target the 70-80% success sweet spot when it knows the true difficulty of each task.
- **Better scoring:** Asymmetric weights depend on difficulty. A "hard" task that's actually easy would give too much credit for correct answers and too little penalty for incorrect ones.
- **Content quality signal:** Tasks where the calibrated difficulty diverges significantly from the authored difficulty may need review -- they might be ambiguous, poorly worded, or testing something different than intended.
- **Self-improving system:** The platform gets more accurate over time as it collects data, without requiring manual difficulty audits.

---

## Putting It All Together

### The Full Recommendation Loop

```
function recommend_next_task(user_state, dag, task_bank):
    // 1. Decide: new learning or review?
    if random() < review_probability:  // e.g. 0.15
        return select_review_task(user_state, task_bank)

    // 2. Compute frontier
    frontier = compute_frontier(user_state, dag)

    // 3. Check for prerequisite gaps in frontier skills
    gaps = []
    for skill in frontier:
        gaps.extend(detect_gaps(skill, user_state, dag))
    gaps = unique(gaps)

    if frontier is empty and gaps is empty:
        return select_review_task(user_state, task_bank)

    // 4. Two-stage Thompson Sampling
    //    Stage 1: if gaps exist, sample only among gaps
    //    Stage 2: otherwise, sample among frontier
    chosen_skill = select_skill(gaps, frontier, user_state)

    // 5. Select task at appropriate difficulty
    return select_difficulty(chosen_skill, user_state, task_bank)
```

### Example Walkthrough

Imagine a user with this state:

| Skill | Alpha | Beta | Mean | Status |
|-------|-------|------|------|--------|
| Addition | 15 | 2 | 0.88 | Mastered |
| Subtraction | 12 | 3 | 0.80 | Mastered |
| Multiplication | 10 | 2 | 0.83 | Mastered |
| Division | 8 | 3 | 0.73 | Competent |
| Negative Numbers | 5 | 4 | 0.56 | Developing |
| Fractions | 3 | 5 | 0.38 | Weak |
| Linear Equations | 1 | 1 | 0.50 | Unknown |

**Frontier computation:**
- Division: prereqs (Multiplication) mastered. Division mean 0.73 < 0.85 mastery threshold. **On frontier.**
- Negative Numbers: prereq (Subtraction) mastered. Mean 0.56. **On frontier.**
- Fractions: prereqs (Multiplication, Division). Division at 0.73 >= 0.6 prereq threshold. **On frontier.**
- Linear Equations: prereqs (Negative Numbers at 0.56, Fractions at 0.38). Fractions below 0.6 prereq threshold. **NOT on frontier.**

**Gap detection (using `struggle_threshold` = 0.40):**
- Fractions (0.38) is below `struggle_threshold`. Check prereqs: Multiplication (0.83) and Division (0.73) -- both above 0.40, so no deeper gaps found.
- Division (0.73) and Negative Numbers (0.56) are above `struggle_threshold`, so no gap detection triggered for them.
- **No gap skills found** -- all prerequisites are above `struggle_threshold`.

**Two-stage Thompson Sampling:**
- No gaps → Stage 2 (frontier sampling).
- Draws from frontier: Division Beta(8, 3), Negative Numbers Beta(5, 4), Fractions Beta(3, 5).
- Fractions will most often be selected (highest need), but Negative Numbers will get picked sometimes too, and Division occasionally -- exactly the right behavior.

**What if Division were at 0.35 instead?** Then Fractions' gap detection would find Division below `struggle_threshold` → Division enters the gap set → Stage 1 fires → the system drills Division before letting the user continue with Fractions.

---

## Tunable Parameters

| Parameter | Description | Suggested Default | Notes |
|-----------|-------------|-------------------|-------|
| `prereq_threshold` | Min mastery mean for a prereq to count as "met" | 0.60 | Lower = more permissive progression |
| `mastery_threshold` | Mean above which a skill is "mastered" | 0.85 | Higher = more practice before moving on |
| `struggle_threshold` | Mean below which we check for prerequisite gaps | 0.40 | Triggers backward DAG traversal; used for both the skill and its prereqs |
| `review_probability` | Fraction of tasks reserved for review | 0.15 | Higher = more review, slower new learning |
| `difficulty_weight_min` | Min evidence weight (correct-easy or incorrect-hard) | 0.5 | Controls the asymmetric weight range |
| `difficulty_weight_max` | Max evidence weight (correct-hard or incorrect-easy) | 1.0 | Controls the asymmetric weight range |
| `max_evidence` | Cap on effective evidence (α + β) per skill | 30 | Lower = more responsive to recent performance, prevents "hard stuck" |
| `min_attempts` | Attempts required before displaying mastery level | 3 | Below this, skill shows as "Not Yet Assessed" |

All of these should be configurable and tunable based on user feedback and data analysis.

---

## Summary

The algorithm is built on five composable ideas:

1. **The DAG defines structure** -- prerequisites constrain what we recommend, and backward traversal finds root-cause gaps.
2. **Beta distributions track mastery** -- each skill has a probabilistic estimate that updates with every answer, using asymmetric weights that give more signal to surprising outcomes.
3. **Evidence windowing prevents "hard stuck"** -- capping total evidence ensures the system always responds to recent performance. A student who improves is recognized within ~20 answers, not ~200.
4. **Two-stage Thompson Sampling** -- gaps are resolved before frontier skills, and within each stage, Thompson Sampling naturally balances exploration and exploitation.
5. **Task recalibration** -- per-task statistics are tracked and used to correct difficulty ratings over time, making the entire system more accurate as it collects data.

Together, these create an adaptive system that meets the user where they are, finds the gaps in their understanding, and guides them along the most efficient learning path through the skill graph. Crucially, the system never gives up on a student -- no matter how much they've struggled in the past, a streak of correct answers will always be recognized and rewarded with progression. And scores only change when the student actually answers a question -- never silently in the background.
