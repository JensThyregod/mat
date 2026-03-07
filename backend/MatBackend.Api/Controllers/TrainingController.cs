using MatBackend.Api.Extensions;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models.Scoring;
using MatBackend.Core.Scoring;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatBackend.Api.Controllers;

[Authorize]
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

    private string GetStudentId() => User.GetUserId();

    [HttpGet("me/skills")]
    public async Task<ActionResult<SkillsResponse>> GetSkills()
    {
        var studentId = GetStudentId();
        _logger.LogDebug("[API] GET /training/me/skills for {StudentId}", studentId);

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

    [HttpPost("me/record")]
    public async Task<ActionResult<TrainingResultDto>> RecordResult(
        [FromBody] TrainingAnswerRequest request)
    {
        var studentId = GetStudentId();
        _logger.LogDebug("[API] POST /training/me/record skill={SkillId}", request.SkillId);

        if (string.IsNullOrEmpty(request.SkillId))
            return BadRequest("SkillId is required");

        if (SkillCatalog.GetById(request.SkillId) == null)
            return BadRequest($"Unknown skill: {request.SkillId}");

        var result = await _trainingService.RecordTrainingResultAsync(studentId, request);
        return Ok(result);
    }

    [HttpGet("me/recommend")]
    public async Task<ActionResult<SkillRecommendation>> Recommend(
        [FromQuery] string? category = null)
    {
        var studentId = GetStudentId();
        _logger.LogDebug("[API] GET /training/me/recommend category={Category}", category ?? "all");

        var recommendation = await _trainingService.RecommendNextSkillAsync(studentId, category);
        return Ok(recommendation);
    }

    [HttpPost("me/reset")]
    public async Task<ActionResult> Reset()
    {
        var studentId = GetStudentId();
        _logger.LogWarning("[API] POST /training/me/reset for {StudentId}", studentId);

        await _trainingService.ResetSkillStatesAsync(studentId);
        return Ok(new { message = "All skill states reset" });
    }
}

// Response DTOs
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
