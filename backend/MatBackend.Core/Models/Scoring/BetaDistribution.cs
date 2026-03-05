namespace MatBackend.Core.Models.Scoring;

/// <summary>
/// Immutable representation of a Beta(α, β) distribution tracking mastery belief.
/// α = evidence of mastery, β = evidence of non-mastery.
/// </summary>
public readonly record struct BetaDistribution
{
    public double Alpha { get; }
    public double Beta { get; }

    public BetaDistribution(double alpha, double beta)
    {
        if (alpha < 0) throw new ArgumentOutOfRangeException(nameof(alpha), "Alpha must be non-negative.");
        if (beta < 0) throw new ArgumentOutOfRangeException(nameof(beta), "Beta must be non-negative.");
        Alpha = alpha;
        Beta = beta;
    }

    /// <summary>Uniform prior representing total ignorance.</summary>
    public static BetaDistribution Uniform => new(1.0, 1.0);

    public double Mean => Alpha / (Alpha + Beta);

    public double Variance => (Alpha * Beta) / ((Alpha + Beta) * (Alpha + Beta) * (Alpha + Beta + 1));

    public double TotalEvidence => Alpha + Beta;

    public BetaDistribution WithCorrect(double weight) => new(Alpha + weight, Beta);

    public BetaDistribution WithIncorrect(double weight) => new(Alpha, Beta + weight);

    /// <summary>
    /// Prior-anchored rescaling: preserves distance from Beta(1,1) rather than raw ratio.
    /// This introduces a mild pull toward 0.5, limiting distribution inertia.
    /// </summary>
    public BetaDistribution Rescaled(double maxEvidence)
    {
        if (TotalEvidence <= maxEvidence)
            return this;

        var scale = maxEvidence / TotalEvidence;
        var newAlpha = 1.0 + (Alpha - 1.0) * scale;
        var newBeta = 1.0 + (Beta - 1.0) * scale;
        return new BetaDistribution(Math.Max(newAlpha, 0.001), Math.Max(newBeta, 0.001));
    }

    public override string ToString() => $"Beta({Alpha:F2}, {Beta:F2}) [mean={Mean:F3}]";
}
