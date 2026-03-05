using FluentAssertions;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;

namespace MatBackend.Tests.Scoring;

/// <summary>
/// Category B: Asymmetric difficulty weighting.
/// Validates that surprising outcomes carry more information than expected ones.
/// </summary>
public class DifficultyWeightingTests
{
    private static readonly ScoringParameters P = ScoringParameters.Default;

    [Fact]
    public void Correct_Hard_Task_Gives_More_Weight_Than_Correct_Easy_Task()
    {
        var wHard = BayesianScoringEngine.WeightCorrect(5.0, P);
        var wEasy = BayesianScoringEngine.WeightCorrect(1.0, P);

        wHard.Should().BeGreaterThan(wEasy);
    }

    [Fact]
    public void Incorrect_Easy_Task_Gives_More_Weight_Than_Incorrect_Hard_Task()
    {
        var wEasy = BayesianScoringEngine.WeightIncorrect(1.0, P);
        var wHard = BayesianScoringEngine.WeightIncorrect(5.0, P);

        wEasy.Should().BeGreaterThan(wHard);
    }

    [Theory]
    [InlineData(1.0, 0.6)]   // easy: 0.5 + 0.5*(1/5) = 0.6
    [InlineData(3.0, 0.8)]   // medium: 0.5 + 0.5*(3/5) = 0.8
    [InlineData(5.0, 1.0)]   // hard: 0.5 + 0.5*(5/5) = 1.0
    public void WeightCorrect_Matches_Formula(double difficulty, double expected)
    {
        BayesianScoringEngine.WeightCorrect(difficulty, P)
            .Should().BeApproximately(expected, 0.001);
    }

    [Theory]
    [InlineData(1.0, 0.9)]   // easy: 1.0 - 0.5*(1/5) = 0.9
    [InlineData(3.0, 0.7)]   // medium: 1.0 - 0.5*(3/5) = 0.7
    [InlineData(5.0, 0.5)]   // hard: 1.0 - 0.5*(5/5) = 0.5
    public void WeightIncorrect_Matches_Formula(double difficulty, double expected)
    {
        BayesianScoringEngine.WeightIncorrect(difficulty, P)
            .Should().BeApproximately(expected, 0.001);
    }

    [Fact]
    public void Correct_Easy_Plus_Incorrect_Hard_Weights_Sum_To_Constant()
    {
        // w_correct(d) + w_incorrect(d) should equal DifficultyWeightMin + DifficultyWeightMax
        var expectedSum = P.DifficultyWeightMin + P.DifficultyWeightMax; // 1.5

        for (double d = 1.0; d <= 5.0; d += 0.5)
        {
            var sum = BayesianScoringEngine.WeightCorrect(d, P)
                    + BayesianScoringEngine.WeightIncorrect(d, P);
            sum.Should().BeApproximately(expectedSum, 0.001,
                $"weights at difficulty {d} should sum to {expectedSum}");
        }
    }

    [Fact]
    public void Student_Correct_On_Hard_Tasks_Scores_Higher_Than_On_Easy_Tasks()
    {
        var stateHard = SkillState.NewSkill("algebra");
        var stateEasy = SkillState.NewSkill("algebra");

        for (int i = 0; i < 10; i++)
        {
            stateHard = BayesianScoringEngine.UpdateSkill(stateHard, isCorrect: true, difficulty: 5.0, P);
            stateEasy = BayesianScoringEngine.UpdateSkill(stateEasy, isCorrect: true, difficulty: 1.0, P);
        }

        stateHard.Mean.Should().BeGreaterThan(stateEasy.Mean,
            "correct answers on hard tasks should produce higher mastery than on easy tasks");
    }

    [Fact]
    public void Student_Incorrect_On_Easy_Tasks_Scores_Lower_Than_On_Hard_Tasks()
    {
        var stateEasy = SkillState.NewSkill("algebra");
        var stateHard = SkillState.NewSkill("algebra");

        for (int i = 0; i < 10; i++)
        {
            stateEasy = BayesianScoringEngine.UpdateSkill(stateEasy, isCorrect: false, difficulty: 1.0, P);
            stateHard = BayesianScoringEngine.UpdateSkill(stateHard, isCorrect: false, difficulty: 5.0, P);
        }

        stateEasy.Mean.Should().BeLessThan(stateHard.Mean,
            "incorrect answers on easy tasks should produce lower mastery than on hard tasks");
    }

    [Fact]
    public void Difficulty_Clamped_At_Zero_And_Max()
    {
        // Difficulty below 0 should clamp to min weight
        BayesianScoringEngine.WeightCorrect(-1.0, P)
            .Should().BeApproximately(P.DifficultyWeightMin, 0.001);

        // Difficulty above max should clamp to max weight
        BayesianScoringEngine.WeightCorrect(10.0, P)
            .Should().BeApproximately(P.DifficultyWeightMax, 0.001);
    }

    [Fact]
    public void Medium_Difficulty_Gives_Intermediate_Weight()
    {
        var wCorrect = BayesianScoringEngine.WeightCorrect(2.5, P);
        var wMin = BayesianScoringEngine.WeightCorrect(0, P);
        var wMax = BayesianScoringEngine.WeightCorrect(5, P);

        wCorrect.Should().BeGreaterThan(wMin).And.BeLessThan(wMax);
    }
}
