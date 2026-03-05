using MatBackend.Core.Interfaces;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;
using Microsoft.AspNetCore.Mvc;

namespace MatBackend.Api.Controllers;

[ApiController]
[Route("api/training")]
public class TrainingController : ControllerBase
{
    private readonly ITrainingService _trainingService;
    private readonly ILogger<TrainingController> _logger;

    public TrainingController(ITrainingService trainingService, ILogger<TrainingController> logger)
    {
        _trainingService = trainingService;
        _logger = logger;
    }

    /// <summary>
    /// Get all skill states for a student.
    /// Returns mastery levels, means, and metadata for all 22 skills.
    /// </summary>
    [HttpGet("{studentId}/skills")]
    public async Task<ActionResult<SkillsResponse>> GetSkills(string studentId)
    {
        _logger.LogDebug("[API] GET /training/{StudentId}/skills", studentId);

        var states = await _trainingService.GetSkillStatesAsync(studentId);
        var params_ = ScoringParameters.Default;

        var skills = states.Values.Select(s => new SkillStateDto
        {
            SkillId = s.SkillId,
            Alpha = s.Distribution.Alpha,
            Beta = s.Distribution.Beta,
            Mean = s.Mean,
            TotalAttempts = s.TotalAttempts,
            MasteryLevel = BayesianScoringEngine.GetMasteryLevel(s, params_).ToString(),
            DanishGrade = BayesianScoringEngine.GetDanishGrade(s, params_)?.ToDisplayString(),
            ProgressWithinLevel = BayesianScoringEngine.GetProgressWithinLevel(s, params_),
            LastPracticed = s.LastPracticed
        }).ToList();

        var catalog = SkillCatalog.AllSkills.ToDictionary(s => s.SkillId);

        return Ok(new SkillsResponse
        {
            StudentId = studentId,
            Skills = skills,
            SkillCatalog = catalog.Values.Select(s => new SkillCatalogEntry
            {
                SkillId = s.SkillId,
                Name = s.Name,
                Category = s.Category,
                Generators = s.Generators
            }).ToList()
        });
    }

    /// <summary>
    /// Record the result of a training task.
    /// Updates the Bayesian skill state and returns the new mastery level.
    /// </summary>
    [HttpPost("{studentId}/record")]
    public async Task<ActionResult<TrainingResultDto>> RecordResult(
        string studentId, [FromBody] TrainingAnswerRequest request)
    {
        _logger.LogDebug("[API] POST /training/{StudentId}/record skill={SkillId}", studentId, request.SkillId);

        if (string.IsNullOrEmpty(request.SkillId))
            return BadRequest("SkillId is required");

        if (SkillCatalog.GetById(request.SkillId) == null)
            return BadRequest($"Unknown skill: {request.SkillId}");

        var result = await _trainingService.RecordTrainingResultAsync(studentId, request);
        return Ok(result);
    }

    /// <summary>
    /// Get a recommendation for the next skill to practice.
    /// Uses Thompson Sampling to balance exploration and exploitation.
    /// </summary>
    [HttpGet("{studentId}/recommend")]
    public async Task<ActionResult<SkillRecommendation>> Recommend(
        string studentId, [FromQuery] string? category = null)
    {
        _logger.LogDebug("[API] GET /training/{StudentId}/recommend category={Category}",
            studentId, category ?? "all");

        var recommendation = await _trainingService.RecommendNextSkillAsync(studentId, category);
        return Ok(recommendation);
    }

    /// <summary>
    /// Reset all skill states for a student (dev/testing only).
    /// </summary>
    [HttpPost("{studentId}/reset")]
    public async Task<ActionResult> Reset(string studentId)
    {
        _logger.LogWarning("[API] POST /training/{StudentId}/reset", studentId);

        await _trainingService.ResetSkillStatesAsync(studentId);
        return Ok(new { message = "All skill states reset" });
    }
}

// ── Response DTOs ─────────────────────────────────────────────

public class SkillsResponse
{
    public string StudentId { get; set; } = string.Empty;
    public List<SkillStateDto> Skills { get; set; } = new();
    public List<SkillCatalogEntry> SkillCatalog { get; set; } = new();
}

public class SkillCatalogEntry
{
    public string SkillId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string[] Generators { get; set; } = [];
}
