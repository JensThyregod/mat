using MatBackend.Core.Models.Scoring;

namespace MatBackend.Core.Scoring;

/// <summary>
/// Pure-function scoring engine implementing the two-layer Bayesian architecture.
/// No I/O, no dependencies -- all state is passed in and returned.
/// </summary>
public static class BayesianScoringEngine
{
    // ── Asymmetric difficulty weights ──────────────────────────────────

    /// <summary>
    /// Correct on hard task = strong signal; correct on easy task = weak signal.
    /// Range: [DifficultyWeightMin, DifficultyWeightMax].
    /// </summary>
    public static double WeightCorrect(double difficulty, ScoringParameters p)
    {
        var normalized = Math.Clamp(difficulty / p.MaxDifficulty, 0.0, 1.0);
        return p.DifficultyWeightMin + (p.DifficultyWeightMax - p.DifficultyWeightMin) * normalized;
    }

    /// <summary>
    /// Incorrect on easy task = strong signal; incorrect on hard task = weak signal.
    /// Range: [DifficultyWeightMin, DifficultyWeightMax].
    /// </summary>
    public static double WeightIncorrect(double difficulty, ScoringParameters p)
    {
        var normalized = Math.Clamp(difficulty / p.MaxDifficulty, 0.0, 1.0);
        return p.DifficultyWeightMax - (p.DifficultyWeightMax - p.DifficultyWeightMin) * normalized;
    }

    // ── Single-skill update ───────────────────────────────────────────

    /// <summary>
    /// Applies a Bayesian update with asymmetric difficulty weighting and evidence windowing.
    /// Returns a new SkillState (immutable).
    /// </summary>
    public static SkillState UpdateSkill(
        SkillState state,
        bool isCorrect,
        double difficulty,
        ScoringParameters p,
        DateTime? timestamp = null)
    {
        var weight = isCorrect
            ? WeightCorrect(difficulty, p)
            : WeightIncorrect(difficulty, p);

        var dist = isCorrect
            ? state.Distribution.WithCorrect(weight)
            : state.Distribution.WithIncorrect(weight);

        dist = dist.Rescaled(p.MaxEvidence);

        return state with
        {
            Distribution = dist,
            TotalAttempts = state.TotalAttempts + 1,
            LastPracticed = timestamp ?? DateTime.UtcNow
        };
    }

    // ── Multi-skill update ────────────────────────────────────────────

    /// <summary>
    /// Handles tasks that test multiple skills with 70/30 primary/secondary weighting.
    /// Returns a new dictionary of updated skill states.
    /// </summary>
    public static Dictionary<string, SkillState> UpdateSkillMulti(
        Dictionary<string, SkillState> states,
        bool isCorrect,
        double difficulty,
        string primarySkillId,
        IReadOnlyList<string> secondarySkillIds,
        ScoringParameters p,
        DateTime? timestamp = null)
    {
        var result = new Dictionary<string, SkillState>(states);

        var baseWeight = isCorrect
            ? WeightCorrect(difficulty, p)
            : WeightIncorrect(difficulty, p);

        var hasSecondary = secondarySkillIds.Count > 0;
        var primaryWeight = hasSecondary
            ? baseWeight * p.PrimarySkillWeightFraction
            : baseWeight;

        var secondaryWeight = hasSecondary
            ? baseWeight * (1.0 - p.PrimarySkillWeightFraction) / secondarySkillIds.Count
            : 0.0;

        result[primarySkillId] = ApplyWeightedUpdate(
            result[primarySkillId], isCorrect, primaryWeight, p, timestamp);

        foreach (var secId in secondarySkillIds)
        {
            result[secId] = ApplyWeightedUpdate(
                result[secId], isCorrect, secondaryWeight, p, timestamp);
        }

        return result;
    }

    private static SkillState ApplyWeightedUpdate(
        SkillState state,
        bool isCorrect,
        double weight,
        ScoringParameters p,
        DateTime? timestamp)
    {
        var dist = isCorrect
            ? state.Distribution.WithCorrect(weight)
            : state.Distribution.WithIncorrect(weight);

        dist = dist.Rescaled(p.MaxEvidence);

        return state with
        {
            Distribution = dist,
            TotalAttempts = state.TotalAttempts + 1,
            LastPracticed = timestamp ?? DateTime.UtcNow
        };
    }

    // ── Display layer: mastery levels ─────────────────────────────────

    public static MasteryLevel GetMasteryLevel(SkillState state, ScoringParameters p)
    {
        if (state.TotalAttempts < p.MinAttempts)
            return MasteryLevel.NotYetAssessed;

        return MeanToMasteryLevel(state.Mean);
    }

    public static MasteryLevel MeanToMasteryLevel(double mean) => mean switch
    {
        < 0.15 => MasteryLevel.NotStarted,
        < 0.35 => MasteryLevel.Beginning,
        < 0.55 => MasteryLevel.Developing,
        < 0.75 => MasteryLevel.Competent,
        < 0.90 => MasteryLevel.Proficient,
        _ => MasteryLevel.Mastered
    };

    // ── Display layer: Danish grades ──────────────────────────────────

    public static DanishGrade? GetDanishGrade(SkillState state, ScoringParameters p)
    {
        if (state.TotalAttempts < p.MinAttempts)
            return null;

        return MeanToDanishGrade(state.Mean);
    }

    public static DanishGrade MeanToDanishGrade(double mean) => mean switch
    {
        < 0.20 => DanishGrade.Minus3,
        < 0.35 => DanishGrade.Zero,
        < 0.50 => DanishGrade.Two,
        < 0.65 => DanishGrade.Four,
        < 0.80 => DanishGrade.Seven,
        < 0.90 => DanishGrade.Ten,
        _ => DanishGrade.Twelve
    };

    // ── Display layer: progress within level ──────────────────────────

    /// <summary>
    /// Returns 0.0-1.0 representing progress toward the next mastery level.
    /// </summary>
    public static double GetProgressWithinLevel(SkillState state, ScoringParameters p)
    {
        if (state.TotalAttempts < p.MinAttempts)
            return 0.0;

        var mean = state.Mean;
        var (low, high) = GetLevelBounds(MeanToMasteryLevel(mean));

        if (high <= low) return 1.0; // Mastered level
        return Math.Clamp((mean - low) / (high - low), 0.0, 1.0);
    }

    private static (double Low, double High) GetLevelBounds(MasteryLevel level) => level switch
    {
        MasteryLevel.NotStarted => (0.00, 0.15),
        MasteryLevel.Beginning => (0.15, 0.35),
        MasteryLevel.Developing => (0.35, 0.55),
        MasteryLevel.Competent => (0.55, 0.75),
        MasteryLevel.Proficient => (0.75, 0.90),
        MasteryLevel.Mastered => (0.90, 1.00),
        _ => (0.0, 1.0)
    };
}
