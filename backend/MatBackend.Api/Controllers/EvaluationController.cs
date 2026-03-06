using MatBackend.Api.Extensions;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatBackend.Api.Controllers;

[Authorize]
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

        var studentId = User.GetKeycloakUserId();
        submission.StudentId = studentId;

        var results = await _evaluationService.EvaluateSubmissionAsync(submission);

        await _skillService.UpdateStudentSkillsAsync(studentId, submission.Answers, results);

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
