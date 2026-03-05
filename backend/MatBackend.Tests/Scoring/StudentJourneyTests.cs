using FluentAssertions;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;

namespace MatBackend.Tests.Scoring;

/// <summary>
/// Category F: Realistic student journey scenarios.
/// These are the "judge" tests -- simulating full student journeys and asserting
/// the system produces sensible, fair outcomes.
/// </summary>
public class StudentJourneyTests
{
    private static readonly ScoringParameters P = ScoringParameters.Default;

    private static SkillState SimulateAnswers(
        SkillState state, int count, bool correct, double difficulty, ScoringParameters? p = null)
    {
        p ??= P;
        for (int i = 0; i < count; i++)
            state = BayesianScoringEngine.UpdateSkill(state, correct, difficulty, p);
        return state;
    }

    private static SkillState SimulateMixed(
        SkillState state, int count, double correctRate, double difficulty, ScoringParameters? p = null)
    {
        p ??= P;
        var rng = new Random(42); // deterministic seed
        for (int i = 0; i < count; i++)
        {
            var isCorrect = rng.NextDouble() < correctRate;
            state = BayesianScoringEngine.UpdateSkill(state, isCorrect, difficulty, p);
        }
        return state;
    }

    // ── Journey 1: The Steady Learner ─────────────────────────────────

    [Fact]
    public void Journey_SteadyLearner_Ends_Around_Competent()
    {
        var state = SkillState.NewSkill("fractions");
        state = SimulateMixed(state, count: 30, correctRate: 0.75, difficulty: 3.0);

        state.Mean.Should().BeInRange(0.55, 0.90,
            "a 75% correct rate at medium difficulty should land around Competent/Proficient");

        var level = BayesianScoringEngine.GetMasteryLevel(state, P);
        level.Should().BeOneOf(MasteryLevel.Competent, MasteryLevel.Proficient);
    }

    // ── Journey 2: The Struggling Student ─────────────────────────────

    [Fact]
    public void Journey_StrugglingStudent_Stays_Low()
    {
        var state = SkillState.NewSkill("fractions");
        state = SimulateMixed(state, count: 20, correctRate: 0.30, difficulty: 1.0);

        state.Mean.Should().BeLessThan(0.50,
            "a 30% correct rate on easy tasks should produce a below-average score");

        var level = BayesianScoringEngine.GetMasteryLevel(state, P);
        level.Should().BeOneOf(MasteryLevel.NotStarted, MasteryLevel.Beginning, MasteryLevel.Developing);
    }

    // ── Journey 3: The Natural Talent ─────────────────────────────────

    [Fact]
    public void Journey_NaturalTalent_Reaches_Proficient_Quickly()
    {
        var state = SkillState.NewSkill("fractions");
        state = SimulateMixed(state, count: 15, correctRate: 0.95, difficulty: 5.0);

        state.Mean.Should().BeGreaterThan(0.75,
            "95% correct on hard tasks should reach Proficient quickly");

        var level = BayesianScoringEngine.GetMasteryLevel(state, P);
        level.Should().BeOneOf(MasteryLevel.Proficient, MasteryLevel.Mastered);
    }

    // ── Journey 4: The Comeback Kid ───────────────────────────────────

    [Fact]
    public void Journey_ComebackKid_Recovers_From_Long_Struggle()
    {
        var state = SkillState.NewSkill("fractions");

        // Phase 1: 30 wrong answers
        state = SimulateAnswers(state, count: 30, correct: false, difficulty: 3.0);
        state.Mean.Should().BeLessThan(0.15, "should be very low after 30 wrong");

        // Phase 2: 20 correct answers -- the comeback
        state = SimulateAnswers(state, count: 20, correct: true, difficulty: 3.0);

        state.Mean.Should().BeGreaterThan(0.35,
            "evidence windowing should allow recovery to at least Developing after 20 correct");

        var level = BayesianScoringEngine.GetMasteryLevel(state, P);
        level.Should().BeOneOf(MasteryLevel.Developing, MasteryLevel.Competent);
    }

    // ── Journey 5: The Inconsistent Student ───────────────────────────

    [Fact]
    public void Journey_InconsistentStudent_Hovers_Around_Developing()
    {
        var state = SkillState.NewSkill("fractions");

        // 4 cycles of 5 right / 5 wrong
        for (int cycle = 0; cycle < 4; cycle++)
        {
            state = SimulateAnswers(state, count: 5, correct: true, difficulty: 3.0);
            state = SimulateAnswers(state, count: 5, correct: false, difficulty: 3.0);
        }

        state.Mean.Should().BeInRange(0.30, 0.60,
            "alternating right/wrong should hover around the middle");

        var level = BayesianScoringEngine.GetMasteryLevel(state, P);
        level.Should().BeOneOf(MasteryLevel.Beginning, MasteryLevel.Developing, MasteryLevel.Competent);
    }

    // ── Journey 6: The Slow Starter ───────────────────────────────────

    [Fact]
    public void Journey_SlowStarter_Shows_Clear_Upward_Trajectory()
    {
        var state = SkillState.NewSkill("fractions");

        // Phase 1: 10 wrong
        state = SimulateAnswers(state, count: 10, correct: false, difficulty: 2.0);
        var meanAfterStruggle = state.Mean;

        // Phase 2: 10 tasks at 50% correct
        state = SimulateMixed(state, count: 10, correctRate: 0.50, difficulty: 3.0);
        var meanAfterImproving = state.Mean;

        // Phase 3: 10 tasks at 70% correct
        state = SimulateMixed(state, count: 10, correctRate: 0.70, difficulty: 3.0);
        var meanAfterGood = state.Mean;

        // Phase 4: 10 tasks at 90% correct
        state = SimulateMixed(state, count: 10, correctRate: 0.90, difficulty: 4.0);
        var meanAfterExcellent = state.Mean;

        // Each phase should show improvement
        meanAfterImproving.Should().BeGreaterThan(meanAfterStruggle, "50% rate should improve from all-wrong");
        meanAfterGood.Should().BeGreaterThan(meanAfterImproving, "70% rate should improve further");
        meanAfterExcellent.Should().BeGreaterThan(meanAfterGood, "90% rate should improve further still");

        meanAfterExcellent.Should().BeGreaterThan(0.55,
            "slow starter ending at 90% correct should reach at least Competent");
    }

    // ── Journey 7: The Overachiever Who Slips ─────────────────────────

    [Fact]
    public void Journey_OverachieverSlips_Drops_Noticeably_On_Easy_Failures()
    {
        var state = SkillState.NewSkill("fractions");

        // Phase 1: 20 correct on hard tasks -- reaches high mastery
        state = SimulateAnswers(state, count: 20, correct: true, difficulty: 5.0);
        var peakMean = state.Mean;
        peakMean.Should().BeGreaterThan(0.80, "should reach high mastery after 20 hard-correct");

        // Phase 2: 10 wrong on easy tasks -- strong negative signal
        state = SimulateAnswers(state, count: 10, correct: false, difficulty: 1.0);

        state.Mean.Should().BeLessThan(peakMean - 0.15,
            "easy-task failures should cause a noticeable drop (high weight for surprising failures)");

        state.Mean.Should().BeLessThan(0.75,
            "10 easy failures should pull the overachiever below Proficient");
    }

    // ── Journey 8: Fresh Start vs. Veteran ────────────────────────────

    [Fact]
    public void Journey_FreshStart_Shifts_More_Than_Veteran()
    {
        var fresh = SkillState.NewSkill("fractions"); // Beta(1,1)
        var veteran = SkillState.NewSkill("fractions") with
        {
            Distribution = new BetaDistribution(15, 15), // mean = 0.5, but high confidence
            TotalAttempts = 28
        };

        var freshBefore = fresh.Mean;
        var veteranBefore = veteran.Mean;

        // Both get 5 correct at medium difficulty
        for (int i = 0; i < 5; i++)
        {
            fresh = BayesianScoringEngine.UpdateSkill(fresh, true, 3.0, P);
            veteran = BayesianScoringEngine.UpdateSkill(veteran, true, 3.0, P);
        }

        var freshShift = fresh.Mean - freshBefore;
        var veteranShift = veteran.Mean - veteranBefore;

        freshShift.Should().BeGreaterThan(veteranShift,
            "a new student (high variance) should shift more dramatically than a veteran (low variance)");
    }

    // ── Journey 9: Difficulty Matters ─────────────────────────────────

    [Fact]
    public void Journey_DifficultyMatters_Hard_Correct_Beats_Easy_Correct()
    {
        var studentA = SkillState.NewSkill("fractions"); // easy tasks
        var studentB = SkillState.NewSkill("fractions"); // hard tasks

        for (int i = 0; i < 10; i++)
        {
            studentA = BayesianScoringEngine.UpdateSkill(studentA, true, 1.0, P);
            studentB = BayesianScoringEngine.UpdateSkill(studentB, true, 5.0, P);
        }

        studentB.Mean.Should().BeGreaterThan(studentA.Mean,
            "10 correct on hard tasks should produce meaningfully higher mastery than 10 correct on easy tasks");

        var gap = studentB.Mean - studentA.Mean;
        gap.Should().BeGreaterThan(0.03,
            "the difference should be meaningful, not negligible");
    }

    // ── Journey 10: Multi-Skill Fairness ──────────────────────────────

    [Fact]
    public void Journey_MultiSkillFairness_Primary_Accumulates_More_Than_Secondary()
    {
        var states = new Dictionary<string, SkillState>
        {
            ["primary"] = SkillState.NewSkill("primary"),
            ["secondary"] = SkillState.NewSkill("secondary")
        };

        for (int i = 0; i < 20; i++)
        {
            states = BayesianScoringEngine.UpdateSkillMulti(
                states, isCorrect: true, difficulty: 3.0,
                primarySkillId: "primary",
                secondarySkillIds: new[] { "secondary" },
                p: P);
        }

        states["primary"].Mean.Should().BeGreaterThan(states["secondary"].Mean,
            "skill tested as primary should have higher mastery than one tested only as secondary");

        states["secondary"].Mean.Should().BeGreaterThan(0.55,
            "secondary skill should still accumulate meaningful evidence over 20 tasks");

        states["secondary"].TotalAttempts.Should().Be(20,
            "secondary skill should have all attempts counted");
    }
}
