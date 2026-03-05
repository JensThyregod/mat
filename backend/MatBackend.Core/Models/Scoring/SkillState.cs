namespace MatBackend.Core.Models.Scoring;

/// <summary>
/// Per-user, per-skill state combining the Beta distribution with practice metadata.
/// Immutable -- update methods return new instances.
/// </summary>
public record SkillState
{
    public string SkillId { get; init; } = string.Empty;
    public BetaDistribution Distribution { get; init; } = BetaDistribution.Uniform;
    public int TotalAttempts { get; init; }
    public DateTime? LastPracticed { get; init; }
    public TimeSpan? ReviewInterval { get; init; }
    public DateTime? NextReviewAt { get; init; }

    public double Mean => Distribution.Mean;
    public double Variance => Distribution.Variance;

    public static SkillState NewSkill(string skillId) => new()
    {
        SkillId = skillId,
        Distribution = BetaDistribution.Uniform,
        TotalAttempts = 0
    };
}
