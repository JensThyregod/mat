using FluentAssertions;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;

namespace MatBackend.Tests.Scoring;

/// <summary>
/// Category E: Multi-skill task evidence splitting.
/// Validates the 70/30 primary/secondary weighting for tasks that test multiple skills.
/// </summary>
public class MultiSkillTests
{
    private static readonly ScoringParameters P = ScoringParameters.Default;

    private static Dictionary<string, SkillState> MakeStates(params string[] skillIds)
    {
        var dict = new Dictionary<string, SkillState>();
        foreach (var id in skillIds)
            dict[id] = SkillState.NewSkill(id);
        return dict;
    }

    [Fact]
    public void Primary_Skill_Receives_70_Percent_Of_Weight()
    {
        var states = MakeStates("fractions", "multiplication");
        var baseWeight = BayesianScoringEngine.WeightCorrect(3.0, P);
        var expectedPrimaryWeight = baseWeight * 0.70;

        var updated = BayesianScoringEngine.UpdateSkillMulti(
            states, isCorrect: true, difficulty: 3.0,
            primarySkillId: "fractions",
            secondarySkillIds: new[] { "multiplication" },
            p: P);

        var primaryAlphaGain = updated["fractions"].Distribution.Alpha - 1.0;
        primaryAlphaGain.Should().BeApproximately(expectedPrimaryWeight, 0.001);
    }

    [Fact]
    public void Secondary_Skills_Split_Remaining_30_Percent()
    {
        var states = MakeStates("fractions", "multiplication", "division");
        var baseWeight = BayesianScoringEngine.WeightCorrect(3.0, P);
        var expectedSecondaryWeight = baseWeight * 0.30 / 2; // 2 secondary skills

        var updated = BayesianScoringEngine.UpdateSkillMulti(
            states, isCorrect: true, difficulty: 3.0,
            primarySkillId: "fractions",
            secondarySkillIds: new[] { "multiplication", "division" },
            p: P);

        var multAlphaGain = updated["multiplication"].Distribution.Alpha - 1.0;
        var divAlphaGain = updated["division"].Distribution.Alpha - 1.0;

        multAlphaGain.Should().BeApproximately(expectedSecondaryWeight, 0.001);
        divAlphaGain.Should().BeApproximately(expectedSecondaryWeight, 0.001);
    }

    [Fact]
    public void Single_Skill_Task_Gives_100_Percent_Weight_To_Primary()
    {
        var states = MakeStates("fractions");
        var baseWeight = BayesianScoringEngine.WeightCorrect(3.0, P);

        var updated = BayesianScoringEngine.UpdateSkillMulti(
            states, isCorrect: true, difficulty: 3.0,
            primarySkillId: "fractions",
            secondarySkillIds: Array.Empty<string>(),
            p: P);

        var alphaGain = updated["fractions"].Distribution.Alpha - 1.0;
        alphaGain.Should().BeApproximately(baseWeight, 0.001,
            "with no secondary skills, primary gets the full weight");
    }

    [Fact]
    public void Three_Secondary_Skills_Each_Get_10_Percent()
    {
        var states = MakeStates("primary", "sec1", "sec2", "sec3");
        var baseWeight = BayesianScoringEngine.WeightCorrect(3.0, P);
        var expectedEach = baseWeight * 0.30 / 3; // 10% each

        var updated = BayesianScoringEngine.UpdateSkillMulti(
            states, isCorrect: true, difficulty: 3.0,
            primarySkillId: "primary",
            secondarySkillIds: new[] { "sec1", "sec2", "sec3" },
            p: P);

        foreach (var secId in new[] { "sec1", "sec2", "sec3" })
        {
            var gain = updated[secId].Distribution.Alpha - 1.0;
            gain.Should().BeApproximately(expectedEach, 0.001,
                $"{secId} should receive ~10% of total weight");
        }
    }

    [Fact]
    public void All_Tagged_Skills_Get_TotalAttempts_Incremented()
    {
        var states = MakeStates("primary", "sec1", "sec2");

        var updated = BayesianScoringEngine.UpdateSkillMulti(
            states, isCorrect: true, difficulty: 3.0,
            primarySkillId: "primary",
            secondarySkillIds: new[] { "sec1", "sec2" },
            p: P);

        updated["primary"].TotalAttempts.Should().Be(1);
        updated["sec1"].TotalAttempts.Should().Be(1);
        updated["sec2"].TotalAttempts.Should().Be(1);
    }

    [Fact]
    public void Incorrect_Multi_Skill_Updates_Beta_Not_Alpha()
    {
        var states = MakeStates("primary", "secondary");

        var updated = BayesianScoringEngine.UpdateSkillMulti(
            states, isCorrect: false, difficulty: 3.0,
            primarySkillId: "primary",
            secondarySkillIds: new[] { "secondary" },
            p: P);

        // Alpha should stay at 1.0, beta should increase
        updated["primary"].Distribution.Alpha.Should().Be(1.0);
        updated["primary"].Distribution.Beta.Should().BeGreaterThan(1.0);
        updated["secondary"].Distribution.Alpha.Should().Be(1.0);
        updated["secondary"].Distribution.Beta.Should().BeGreaterThan(1.0);
    }

    [Fact]
    public void Primary_Gets_More_Evidence_Than_Any_Single_Secondary()
    {
        var states = MakeStates("primary", "secondary");

        var updated = BayesianScoringEngine.UpdateSkillMulti(
            states, isCorrect: true, difficulty: 3.0,
            primarySkillId: "primary",
            secondarySkillIds: new[] { "secondary" },
            p: P);

        var primaryGain = updated["primary"].Distribution.Alpha - 1.0;
        var secondaryGain = updated["secondary"].Distribution.Alpha - 1.0;

        primaryGain.Should().BeGreaterThan(secondaryGain,
            "primary skill should accumulate more evidence than secondary");
    }

    [Fact]
    public void Total_Evidence_Distributed_Equals_Base_Weight()
    {
        var states = MakeStates("primary", "sec1", "sec2");
        var baseWeight = BayesianScoringEngine.WeightCorrect(3.0, P);

        var updated = BayesianScoringEngine.UpdateSkillMulti(
            states, isCorrect: true, difficulty: 3.0,
            primarySkillId: "primary",
            secondarySkillIds: new[] { "sec1", "sec2" },
            p: P);

        var totalGain = (updated["primary"].Distribution.Alpha - 1.0)
                      + (updated["sec1"].Distribution.Alpha - 1.0)
                      + (updated["sec2"].Distribution.Alpha - 1.0);

        totalGain.Should().BeApproximately(baseWeight, 0.001,
            "total distributed evidence should equal the base weight");
    }
}
