using FluentAssertions;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;

namespace MatBackend.Tests.Scoring;

/// <summary>
/// Category D: Display layer mapping.
/// Validates mastery levels, Danish grades, and progress-within-level calculations.
/// </summary>
public class DisplayMappingTests
{
    private static readonly ScoringParameters P = ScoringParameters.Default;

    // ── Mastery level: NotYetAssessed gate ─────────────────────────────

    [Fact]
    public void Zero_Attempts_Returns_NotYetAssessed()
    {
        var state = SkillState.NewSkill("fractions");
        BayesianScoringEngine.GetMasteryLevel(state, P)
            .Should().Be(MasteryLevel.NotYetAssessed);
    }

    [Fact]
    public void Below_MinAttempts_Returns_NotYetAssessed_Regardless_Of_Mean()
    {
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(10, 1), // mean ≈ 0.91
            TotalAttempts = P.MinAttempts - 1
        };

        BayesianScoringEngine.GetMasteryLevel(state, P)
            .Should().Be(MasteryLevel.NotYetAssessed);
    }

    [Fact]
    public void At_MinAttempts_Uses_Mean_For_Level()
    {
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = BetaDistribution.Uniform, // mean = 0.5
            TotalAttempts = P.MinAttempts
        };

        BayesianScoringEngine.GetMasteryLevel(state, P)
            .Should().Be(MasteryLevel.Developing);
    }

    // ── Mastery level thresholds ──────────────────────────────────────

    [Theory]
    [InlineData(0.00, MasteryLevel.NotStarted)]
    [InlineData(0.07, MasteryLevel.NotStarted)]
    [InlineData(0.14, MasteryLevel.NotStarted)]
    [InlineData(0.15, MasteryLevel.Beginning)]
    [InlineData(0.25, MasteryLevel.Beginning)]
    [InlineData(0.34, MasteryLevel.Beginning)]
    [InlineData(0.35, MasteryLevel.Developing)]
    [InlineData(0.45, MasteryLevel.Developing)]
    [InlineData(0.54, MasteryLevel.Developing)]
    [InlineData(0.55, MasteryLevel.Competent)]
    [InlineData(0.65, MasteryLevel.Competent)]
    [InlineData(0.74, MasteryLevel.Competent)]
    [InlineData(0.75, MasteryLevel.Proficient)]
    [InlineData(0.82, MasteryLevel.Proficient)]
    [InlineData(0.89, MasteryLevel.Proficient)]
    [InlineData(0.90, MasteryLevel.Mastered)]
    [InlineData(0.95, MasteryLevel.Mastered)]
    [InlineData(1.00, MasteryLevel.Mastered)]
    public void MeanToMasteryLevel_Maps_Correctly(double mean, MasteryLevel expected)
    {
        BayesianScoringEngine.MeanToMasteryLevel(mean).Should().Be(expected);
    }

    // ── Danish grade thresholds (matching 7-trinsskalaen) ─────────────

    [Theory]
    [InlineData(0.00, DanishGrade.Minus3)]
    [InlineData(0.10, DanishGrade.Minus3)]
    [InlineData(0.19, DanishGrade.Minus3)]
    [InlineData(0.20, DanishGrade.Zero)]
    [InlineData(0.34, DanishGrade.Zero)]
    [InlineData(0.35, DanishGrade.Two)]
    [InlineData(0.49, DanishGrade.Two)]
    [InlineData(0.50, DanishGrade.Four)]
    [InlineData(0.64, DanishGrade.Four)]
    [InlineData(0.65, DanishGrade.Seven)]
    [InlineData(0.79, DanishGrade.Seven)]
    [InlineData(0.80, DanishGrade.Ten)]
    [InlineData(0.89, DanishGrade.Ten)]
    [InlineData(0.90, DanishGrade.Twelve)]
    [InlineData(1.00, DanishGrade.Twelve)]
    public void MeanToDanishGrade_Maps_Correctly(double mean, DanishGrade expected)
    {
        BayesianScoringEngine.MeanToDanishGrade(mean).Should().Be(expected);
    }

    // ── Danish grade: MinAttempts gate ───────────────────────────────

    [Fact]
    public void GetDanishGrade_Returns_Null_When_Below_MinAttempts()
    {
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(10, 1),
            TotalAttempts = P.MinAttempts - 1
        };

        BayesianScoringEngine.GetDanishGrade(state, P).Should().BeNull();
    }

    [Fact]
    public void GetDanishGrade_Returns_Grade_At_MinAttempts()
    {
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(9, 1),
            TotalAttempts = P.MinAttempts
        };

        BayesianScoringEngine.GetDanishGrade(state, P).Should().Be(DanishGrade.Twelve);
    }

    // ── Danish grade display strings ──────────────────────────────────

    [Theory]
    [InlineData(DanishGrade.Minus3, "-3")]
    [InlineData(DanishGrade.Zero, "00")]
    [InlineData(DanishGrade.Two, "02")]
    [InlineData(DanishGrade.Four, "4")]
    [InlineData(DanishGrade.Seven, "7")]
    [InlineData(DanishGrade.Ten, "10")]
    [InlineData(DanishGrade.Twelve, "12")]
    public void DanishGrade_DisplayString_Is_Correct(DanishGrade grade, string expected)
    {
        grade.ToDisplayString().Should().Be(expected);
    }

    // ── Progress within level ─────────────────────────────────────────

    [Fact]
    public void Progress_Is_Zero_When_Below_MinAttempts()
    {
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(8, 2), // mean = 0.8
            TotalAttempts = 0
        };

        BayesianScoringEngine.GetProgressWithinLevel(state, P).Should().Be(0.0);
    }

    [Fact]
    public void Progress_At_Bottom_Of_Competent_Is_Near_Zero()
    {
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(55, 45), // mean = 0.55
            TotalAttempts = 10
        };

        var progress = BayesianScoringEngine.GetProgressWithinLevel(state, P);
        progress.Should().BeApproximately(0.0, 0.05);
    }

    [Fact]
    public void Progress_At_Top_Of_Competent_Is_Near_One()
    {
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(74, 26), // mean = 0.74
            TotalAttempts = 10
        };

        var progress = BayesianScoringEngine.GetProgressWithinLevel(state, P);
        progress.Should().BeGreaterThan(0.90);
    }

    [Fact]
    public void Progress_At_Midpoint_Of_Level_Is_Around_Half()
    {
        // Developing: 0.35 - 0.55, midpoint = 0.45
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(45, 55), // mean = 0.45
            TotalAttempts = 10
        };

        var progress = BayesianScoringEngine.GetProgressWithinLevel(state, P);
        progress.Should().BeApproximately(0.5, 0.05);
    }

    [Fact]
    public void Progress_Is_Clamped_Between_0_And_1()
    {
        var state = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(99, 1), // mean = 0.99
            TotalAttempts = 10
        };

        var progress = BayesianScoringEngine.GetProgressWithinLevel(state, P);
        progress.Should().BeGreaterThanOrEqualTo(0.0).And.BeLessThanOrEqualTo(1.0);
    }
}
