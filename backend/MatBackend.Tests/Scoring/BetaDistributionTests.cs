using FluentAssertions;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;

namespace MatBackend.Tests.Scoring;

/// <summary>
/// Category A: Beta distribution fundamentals.
/// Validates the core probabilistic model behaves as expected.
/// </summary>
public class BetaDistributionTests
{
    private static readonly ScoringParameters P = ScoringParameters.Default;

    [Fact]
    public void Uniform_Prior_Has_Mean_0_5()
    {
        var dist = BetaDistribution.Uniform;
        dist.Alpha.Should().Be(1.0);
        dist.Beta.Should().Be(1.0);
        dist.Mean.Should().Be(0.5);
    }

    [Fact]
    public void New_Skill_Starts_At_Uniform()
    {
        var state = SkillState.NewSkill("addition");
        state.Distribution.Should().Be(BetaDistribution.Uniform);
        state.TotalAttempts.Should().Be(0);
        state.Mean.Should().Be(0.5);
    }

    [Fact]
    public void Correct_Answer_Increases_Mean()
    {
        var state = SkillState.NewSkill("addition");
        var updated = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 3, P);
        updated.Mean.Should().BeGreaterThan(state.Mean);
    }

    [Fact]
    public void Incorrect_Answer_Decreases_Mean()
    {
        var state = SkillState.NewSkill("addition");
        var updated = BayesianScoringEngine.UpdateSkill(state, isCorrect: false, difficulty: 3, P);
        updated.Mean.Should().BeLessThan(state.Mean);
    }

    [Fact]
    public void Variance_Decreases_As_Evidence_Accumulates()
    {
        var state = SkillState.NewSkill("addition");
        var initialVariance = state.Variance;

        for (int i = 0; i < 10; i++)
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 3, P);

        state.Variance.Should().BeLessThan(initialVariance);
    }

    [Fact]
    public void Mean_Stays_Within_0_1_After_Many_Correct()
    {
        var state = SkillState.NewSkill("addition");
        for (int i = 0; i < 200; i++)
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 5, P);

        state.Mean.Should().BeGreaterThanOrEqualTo(0.0).And.BeLessThanOrEqualTo(1.0);
    }

    [Fact]
    public void Mean_Stays_Within_0_1_After_Many_Incorrect()
    {
        var state = SkillState.NewSkill("addition");
        for (int i = 0; i < 200; i++)
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: false, difficulty: 1, P);

        state.Mean.Should().BeGreaterThanOrEqualTo(0.0).And.BeLessThanOrEqualTo(1.0);
    }

    [Fact]
    public void TotalAttempts_Increments_On_Each_Update()
    {
        var state = SkillState.NewSkill("addition");
        state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 3, P);
        state = BayesianScoringEngine.UpdateSkill(state, isCorrect: false, difficulty: 2, P);
        state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 4, P);

        state.TotalAttempts.Should().Be(3);
    }

    [Fact]
    public void WithCorrect_Adds_To_Alpha_Only()
    {
        var dist = new BetaDistribution(5.0, 3.0);
        var updated = dist.WithCorrect(0.8);

        updated.Alpha.Should().Be(5.8);
        updated.Beta.Should().Be(3.0);
    }

    [Fact]
    public void WithIncorrect_Adds_To_Beta_Only()
    {
        var dist = new BetaDistribution(5.0, 3.0);
        var updated = dist.WithIncorrect(0.8);

        updated.Alpha.Should().Be(5.0);
        updated.Beta.Should().Be(3.8);
    }

    [Fact]
    public void Constructor_Rejects_Negative_Alpha()
    {
        var act = () => new BetaDistribution(-1.0, 1.0);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Constructor_Rejects_Negative_Beta()
    {
        var act = () => new BetaDistribution(1.0, -1.0);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Consecutive_Correct_Answers_Monotonically_Increase_Mean()
    {
        var state = SkillState.NewSkill("addition");
        var previousMean = state.Mean;

        for (int i = 0; i < 15; i++)
        {
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: true, difficulty: 3, P);
            state.Mean.Should().BeGreaterThan(previousMean,
                $"mean should increase on correct answer {i + 1}");
            previousMean = state.Mean;
        }
    }

    [Fact]
    public void Consecutive_Incorrect_Answers_Monotonically_Decrease_Mean()
    {
        var state = SkillState.NewSkill("addition");
        var previousMean = state.Mean;

        for (int i = 0; i < 15; i++)
        {
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect: false, difficulty: 3, P);
            state.Mean.Should().BeLessThan(previousMean,
                $"mean should decrease on incorrect answer {i + 1}");
            previousMean = state.Mean;
        }
    }
}
