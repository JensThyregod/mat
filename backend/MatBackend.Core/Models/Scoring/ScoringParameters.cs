namespace MatBackend.Core.Models.Scoring;

/// <summary>
/// All tunable constants for the Bayesian scoring engine.
/// Passed explicitly to every function so tests can probe edge cases.
/// </summary>
public record ScoringParameters
{
    public double MaxEvidence { get; init; } = 30.0;
    public double PrereqThreshold { get; init; } = 0.60;
    public double MasteryThreshold { get; init; } = 0.85;
    public double StruggleThreshold { get; init; } = 0.40;
    public int MinAttempts { get; init; } = 8;
    public double DifficultyWeightMin { get; init; } = 0.5;
    public double DifficultyWeightMax { get; init; } = 1.0;
    public double MaxDifficulty { get; init; } = 5.0;
    public double PrimarySkillWeightFraction { get; init; } = 0.70;

    public static ScoringParameters Default => new();
}
