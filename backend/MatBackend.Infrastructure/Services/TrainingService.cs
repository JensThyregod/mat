using MatBackend.Core.Interfaces;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;
using Microsoft.Extensions.Logging;

namespace MatBackend.Infrastructure.Services;

public class TrainingService : ITrainingService
{
    private readonly ISkillStateRepository _repo;
    private readonly ScoringParameters _params;
    private readonly ILogger<TrainingService> _logger;
    private static readonly Random _rng = new();

    public TrainingService(
        ISkillStateRepository repo,
        ScoringParameters scoringParameters,
        ILogger<TrainingService> logger)
    {
        _repo = repo;
        _params = scoringParameters;
        _logger = logger;
    }

    // ── Get all skill states ──────────────────────────────────────

    public async Task<Dictionary<string, SkillState>> GetSkillStatesAsync(string studentId)
    {
        _logger.LogDebug("[Training] GetSkillStates for student={StudentId}", studentId);

        var states = await _repo.GetSkillStatesAsync(studentId);
        var initialized = EnsureAllSkillsExist(states);

        if (initialized > 0)
        {
            _logger.LogInformation(
                "[Training] Initialized {Count} new skill states for student={StudentId}",
                initialized, studentId);
            await _repo.SaveSkillStatesAsync(studentId, states);
        }

        LogSkillSummary(studentId, states);
        return states;
    }

    // ── Record training result ────────────────────────────────────

    public async Task<TrainingResultDto> RecordTrainingResultAsync(string studentId, TrainingAnswerRequest request)
    {
        _logger.LogInformation(
            "[Training] RecordResult student={StudentId} skill={SkillId} difficulty={Difficulty} questions={QuestionCount}",
            studentId, request.SkillId, request.Difficulty, request.Results.Count);

        var states = await _repo.GetSkillStatesAsync(studentId);
        EnsureAllSkillsExist(states);

        if (!states.TryGetValue(request.SkillId, out var currentState))
        {
            currentState = SkillState.NewSkill(request.SkillId);
            states[request.SkillId] = currentState;
        }

        var previousLevel = BayesianScoringEngine.GetMasteryLevel(currentState, _params);
        var difficulty = DifficultyToNumeric(request.Difficulty);

        _logger.LogDebug(
            "[Training] Before update: skill={SkillId} alpha={Alpha:F3} beta={Beta:F3} mean={Mean:F4} attempts={Attempts} level={Level}",
            request.SkillId, currentState.Distribution.Alpha, currentState.Distribution.Beta,
            currentState.Mean, currentState.TotalAttempts, previousLevel);

        var updatedState = currentState;
        for (int i = 0; i < request.Results.Count; i++)
        {
            var isCorrect = request.Results[i].IsCorrect;
            var weight = isCorrect
                ? BayesianScoringEngine.WeightCorrect(difficulty, _params)
                : BayesianScoringEngine.WeightIncorrect(difficulty, _params);

            _logger.LogDebug(
                "[Training]   Q{Index}: correct={IsCorrect} difficulty={Difficulty} weight={Weight:F4}",
                i + 1, isCorrect, difficulty, weight);

            updatedState = BayesianScoringEngine.UpdateSkill(updatedState, isCorrect, difficulty, _params);
        }

        states[request.SkillId] = updatedState;
        await _repo.SaveSkillStatesAsync(studentId, states);

        var newLevel = BayesianScoringEngine.GetMasteryLevel(updatedState, _params);
        var levelChanged = newLevel != previousLevel;

        _logger.LogDebug(
            "[Training] After update: skill={SkillId} alpha={Alpha:F3} beta={Beta:F3} mean={Mean:F4} attempts={Attempts} level={Level}",
            request.SkillId, updatedState.Distribution.Alpha, updatedState.Distribution.Beta,
            updatedState.Mean, updatedState.TotalAttempts, newLevel);

        if (levelChanged)
        {
            _logger.LogInformation(
                "[Training] LEVEL CHANGE student={StudentId} skill={SkillId}: {PrevLevel} -> {NewLevel}",
                studentId, request.SkillId, previousLevel, newLevel);
        }

        var correctCount = request.Results.Count(r => r.IsCorrect);
        _logger.LogInformation(
            "[Training] Result: student={StudentId} skill={SkillId} correct={Correct}/{Total} mean={Mean:F4} level={Level}",
            studentId, request.SkillId, correctCount, request.Results.Count, updatedState.Mean, newLevel);

        return new TrainingResultDto
        {
            SkillId = request.SkillId,
            UpdatedSkill = ToDto(updatedState),
            PreviousLevel = previousLevel.ToString(),
            NewLevel = newLevel.ToString(),
            LevelChanged = levelChanged
        };
    }

    // ── Recommend next skill (Thompson Sampling) ──────────────────

    public async Task<SkillRecommendation> RecommendNextSkillAsync(string studentId, string? categoryFilter = null)
    {
        _logger.LogDebug("[Training] RecommendNextSkill for student={StudentId} category={Category}",
            studentId, categoryFilter ?? "all");

        var states = await _repo.GetSkillStatesAsync(studentId);
        EnsureAllSkillsExist(states);

        var candidateSkills = SkillCatalog.AllSkills.AsEnumerable();
        if (!string.IsNullOrEmpty(categoryFilter))
            candidateSkills = candidateSkills.Where(s => s.Category == categoryFilter);

        var candidateIds = new HashSet<string>(candidateSkills.Select(s => s.SkillId));

        string bestSkillId = candidateIds.First();
        double bestScore = double.MinValue;
        string reason = "default";

        _logger.LogDebug("[Training] Thompson Sampling across {Count} skills (category={Category}):",
            candidateIds.Count, categoryFilter ?? "all");

        foreach (var (skillId, state) in states)
        {
            if (!candidateIds.Contains(skillId))
                continue;

            var sampled = SampleBeta(state.Distribution.Alpha, state.Distribution.Beta);
            var score = 1.0 - sampled;

            _logger.LogDebug(
                "[Training]   skill={SkillId} alpha={Alpha:F2} beta={Beta:F2} mean={Mean:F3} sampled={Sampled:F3} score={Score:F3}",
                skillId, state.Distribution.Alpha, state.Distribution.Beta,
                state.Mean, sampled, score);

            if (score > bestScore)
            {
                bestScore = score;
                bestSkillId = skillId;
            }
        }

        var selectedState = states[bestSkillId];
        var recommendedDifficulty = MeanToDifficulty(selectedState.Mean);
        var level = BayesianScoringEngine.GetMasteryLevel(selectedState, _params);

        if (selectedState.TotalAttempts == 0)
            reason = "Never attempted";
        else if (level <= MasteryLevel.Beginning)
            reason = "Low mastery, needs practice";
        else if (selectedState.Distribution.Alpha + selectedState.Distribution.Beta < 6)
            reason = "High uncertainty, need more data";
        else
            reason = "Thompson sampling selected (probabilistic exploration)";

        _logger.LogInformation(
            "[Training] Recommended: student={StudentId} skill={SkillId} difficulty={Difficulty} category={Category} reason=\"{Reason}\" mean={Mean:F3}",
            studentId, bestSkillId, recommendedDifficulty, categoryFilter ?? "all", reason, selectedState.Mean);

        return new SkillRecommendation
        {
            SkillId = bestSkillId,
            RecommendedDifficulty = recommendedDifficulty,
            Reason = reason
        };
    }

    // ── Reset ─────────────────────────────────────────────────────

    public async Task ResetSkillStatesAsync(string studentId)
    {
        _logger.LogWarning("[Training] RESET all skill states for student={StudentId}", studentId);
        var states = new Dictionary<string, SkillState>();
        foreach (var skill in SkillCatalog.AllSkills)
            states[skill.SkillId] = SkillState.NewSkill(skill.SkillId);
        await _repo.SaveSkillStatesAsync(studentId, states);
    }

    // ── Helpers ───────────────────────────────────────────────────

    private int EnsureAllSkillsExist(Dictionary<string, SkillState> states)
    {
        int count = 0;
        foreach (var skill in SkillCatalog.AllSkills)
        {
            if (!states.ContainsKey(skill.SkillId))
            {
                states[skill.SkillId] = SkillState.NewSkill(skill.SkillId);
                count++;
            }
        }
        return count;
    }

    private SkillStateDto ToDto(SkillState state)
    {
        var level = BayesianScoringEngine.GetMasteryLevel(state, _params);
        var grade = BayesianScoringEngine.GetDanishGrade(state, _params);
        var progress = BayesianScoringEngine.GetProgressWithinLevel(state, _params);

        return new SkillStateDto
        {
            SkillId = state.SkillId,
            Alpha = state.Distribution.Alpha,
            Beta = state.Distribution.Beta,
            Mean = state.Mean,
            TotalAttempts = state.TotalAttempts,
            MasteryLevel = level.ToString(),
            DanishGrade = grade?.ToDisplayString(),
            ProgressWithinLevel = progress,
            LastPracticed = state.LastPracticed
        };
    }

    private void LogSkillSummary(string studentId, Dictionary<string, SkillState> states)
    {
        if (!_logger.IsEnabled(LogLevel.Debug)) return;

        var byLevel = states.Values
            .GroupBy(s => BayesianScoringEngine.GetMasteryLevel(s, _params))
            .OrderBy(g => g.Key);

        _logger.LogDebug("[Training] Skill summary for student={StudentId}:", studentId);
        foreach (var group in byLevel)
        {
            _logger.LogDebug("[Training]   {Level}: {Count} skills", group.Key, group.Count());
        }
    }

    private static double DifficultyToNumeric(string difficulty) => difficulty switch
    {
        "let" => 1.0,
        "middel" => 3.0,
        "svaer" => 5.0,
        _ => 3.0
    };

    private static string MeanToDifficulty(double mean) => mean switch
    {
        < 0.35 => "let",
        < 0.70 => "middel",
        _ => "svaer"
    };

    /// <summary>
    /// Sample from a Beta distribution using the gamma variate method.
    /// </summary>
    private static double SampleBeta(double alpha, double beta)
    {
        var x = GammaVariate(alpha);
        var y = GammaVariate(beta);
        return x / (x + y);
    }

    private static double GammaVariate(double shape)
    {
        if (shape < 1.0)
            return GammaVariate(shape + 1.0) * Math.Pow(_rng.NextDouble(), 1.0 / shape);

        // Marsaglia and Tsang's method
        var d = shape - 1.0 / 3.0;
        var c = 1.0 / Math.Sqrt(9.0 * d);
        while (true)
        {
            double x, v;
            do
            {
                x = NormalVariate();
                v = 1.0 + c * x;
            } while (v <= 0);

            v = v * v * v;
            var u = _rng.NextDouble();
            if (u < 1.0 - 0.0331 * (x * x) * (x * x)) return d * v;
            if (Math.Log(u) < 0.5 * x * x + d * (1.0 - v + Math.Log(v))) return d * v;
        }
    }

    private static double NormalVariate()
    {
        var u1 = _rng.NextDouble();
        var u2 = _rng.NextDouble();
        return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
    }
}
