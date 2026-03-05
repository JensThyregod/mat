using FluentAssertions;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;

namespace MatBackend.Tests.Scoring;

/// <summary>
/// Category C: Evidence windowing (rescaling).
/// Validates that the system prevents "hard stuck" states and stays responsive.
/// </summary>
public class EvidenceWindowingTests
{
    private static readonly ScoringParameters P = ScoringParameters.Default;

    [Fact]
    public void Total_Evidence_Never_Exceeds_MaxEvidence_Plus_One_Update()
    {
        var state = SkillState.NewSkill("fractions");
        var maxSingleWeight = P.DifficultyWeightMax; // 1.0

        for (int i = 0; i < 100; i++)
        {
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 5, P);
            state.Distribution.TotalEvidence.Should()
                .BeLessThanOrEqualTo(P.MaxEvidence + maxSingleWeight + 0.01,
                    $"evidence should be capped after update {i + 1}");
        }
    }

    [Fact]
    public void Hard_Stuck_Scenario_Student_Recovers_After_Improvement()
    {
        var state = SkillState.NewSkill("fractions");

        // 50 wrong answers -- student is struggling
        for (int i = 0; i < 50; i++)
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: false, difficulty: 3, P);

        var meanAfterStruggle = state.Mean;
        meanAfterStruggle.Should().BeLessThan(0.15, "student should be low after many wrong answers");

        // Now 10 correct answers -- student has improved
        for (int i = 0; i < 10; i++)
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 3, P);

        state.Mean.Should().BeGreaterThan(0.25,
            "student should recover significantly after 10 correct answers, not be stuck near 0");
    }

    [Fact]
    public void Rapid_Improver_Recognized_Within_20_Answers()
    {
        var state = SkillState.NewSkill("fractions");

        // 40 wrong answers
        for (int i = 0; i < 40; i++)
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: false, difficulty: 3, P);

        // Now 20 correct answers
        for (int i = 0; i < 20; i++)
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 3, P);

        state.Mean.Should().BeGreaterThan(0.35,
            "system should recognize turnaround within ~20 correct answers");
    }

    [Fact]
    public void Rescaling_Preserves_Mean_Approximately()
    {
        var dist = new BetaDistribution(20.0, 10.0);
        var originalMean = dist.Mean;

        var rescaled = dist.Rescaled(15.0);

        rescaled.Mean.Should().BeApproximately(originalMean, 0.05,
            "rescaling should approximately preserve the mean (slight pull toward 0.5 is acceptable)");
        // Prior-anchored rescaling: new total = 2 + (total-2)*scale, which can slightly exceed maxEvidence
        rescaled.TotalEvidence.Should().BeLessThanOrEqualTo(dist.TotalEvidence,
            "rescaled evidence should be less than original");
    }

    [Fact]
    public void Prior_Anchored_Rescaling_Uniform_Is_Fixed_Point()
    {
        var uniform = BetaDistribution.Uniform;
        var rescaled = uniform.Rescaled(1.5); // force rescaling with a very low cap

        // Beta(1,1) has total=2, rescaling to 1.5 should still produce something near (1,1)
        // because 1 + (1-1)*scale = 1 for both alpha and beta
        rescaled.Alpha.Should().BeApproximately(1.0, 0.001);
        rescaled.Beta.Should().BeApproximately(1.0, 0.001);
    }

    [Fact]
    public void No_Rescaling_When_Below_MaxEvidence()
    {
        var dist = new BetaDistribution(5.0, 3.0);
        var rescaled = dist.Rescaled(30.0);

        rescaled.Alpha.Should().Be(5.0);
        rescaled.Beta.Should().Be(3.0);
    }

    [Fact]
    public void Evidence_Cap_Prevents_Runaway_Accumulation()
    {
        var state = SkillState.NewSkill("addition");

        for (int i = 0; i < 500; i++)
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 5, P);

        state.Distribution.TotalEvidence.Should().BeLessThan(P.MaxEvidence + 2,
            "evidence should be bounded even after 500 updates");
    }

    [Fact]
    public void Lower_MaxEvidence_Makes_System_More_Responsive()
    {
        var responsiveParams = P with { MaxEvidence = 15 };
        var stableParams = P with { MaxEvidence = 50 };

        var stateResponsive = SkillState.NewSkill("fractions");
        var stateStable = SkillState.NewSkill("fractions");

        // Both get 30 wrong
        for (int i = 0; i < 30; i++)
        {
            stateResponsive = BayesianScoringEngine.UpdateSkill(stateResponsive, false, 3, responsiveParams);
            stateStable = BayesianScoringEngine.UpdateSkill(stateStable, false, 3, stableParams);
        }

        // Both get 10 right
        for (int i = 0; i < 10; i++)
        {
            stateResponsive = BayesianScoringEngine.UpdateSkill(stateResponsive, true, 3, responsiveParams);
            stateStable = BayesianScoringEngine.UpdateSkill(stateStable, true, 3, stableParams);
        }

        stateResponsive.Mean.Should().BeGreaterThan(stateStable.Mean,
            "lower MaxEvidence should make the system recover faster");
    }

    [Fact]
    public void Rescaling_Pulls_Slightly_Toward_Prior_Mean()
    {
        // A very skewed distribution should be pulled slightly toward 0.5 after rescaling
        var dist = new BetaDistribution(40.0, 5.0); // mean ≈ 0.889
        var rescaled = dist.Rescaled(20.0);

        // Mean should decrease slightly (pulled toward 0.5)
        rescaled.Mean.Should().BeLessThan(dist.Mean,
            "prior-anchored rescaling should pull extreme means slightly toward 0.5");
        rescaled.Mean.Should().BeGreaterThan(0.8,
            "but the pull should be mild, not dramatic");
    }
}
