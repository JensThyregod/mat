using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace MatBackend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EvaluationController : ControllerBase
{
    private readonly IEvaluationService _evaluationService;
    private readonly ISkillService _skillService;

    public EvaluationController(IEvaluationService evaluationService, ISkillService skillService)
    {
        _evaluationService = evaluationService;
        _skillService = skillService;
    }

    [HttpPost]
    public async Task<ActionResult<EvaluationResponse>> Submit([FromBody] TaskSubmission submission)
    {
        if (submission == null || submission.Answers.Count == 0)
        {
            return BadRequest("No submission data.");
        }

        // 1. Evaluate answers
        var results = await _evaluationService.EvaluateSubmissionAsync(submission);

        // 2. Update skills
        if (!string.IsNullOrEmpty(submission.StudentId))
        {
            await _skillService.UpdateStudentSkillsAsync(submission.StudentId, submission.Answers, results);
        }

        return Ok(new EvaluationResponse 
        { 
            Results = results,
            EvaluatedAt = DateTime.UtcNow
        });
    }
}

public class EvaluationResponse
{
    public List<EvaluationResult> Results { get; set; } = new();
    public DateTime EvaluatedAt { get; set; }
}

