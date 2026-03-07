using MatBackend.Api.Extensions;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatBackend.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/students")]
public class StudentsController : ControllerBase
{
    private readonly ITaskSetService _taskSetService;
    private readonly IAnswerRepository _answerRepository;

    public StudentsController(ITaskSetService taskSetService, IAnswerRepository answerRepository)
    {
        _taskSetService = taskSetService;
        _answerRepository = answerRepository;
    }

    private string GetStudentId() => User.GetUserId();

    [HttpGet("me/tasks")]
    public async Task<ActionResult<List<TaskDto>>> GetTasks()
    {
        var studentId = GetStudentId();
        var tasks = await _taskSetService.GetTasksForStudentAsync(studentId);
        return Ok(tasks);
    }

    [HttpGet("me/tasks/{taskId}")]
    public async Task<ActionResult<TaskDto>> GetTask(string taskId)
    {
        var studentId = GetStudentId();
        var task = await _taskSetService.GetTaskForStudentAsync(studentId, taskId);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpGet("me/answers")]
    public async Task<ActionResult<Dictionary<string, List<AnswerRecord>>>> GetAnswers()
    {
        var studentId = GetStudentId();
        var answers = await _answerRepository.GetAnswersForStudentAsync(studentId);
        return Ok(answers);
    }

    [HttpPost("me/tasks/{taskId}/answers")]
    public async Task<ActionResult<AnswerRecord>> SaveAnswer(
        string taskId, [FromBody] SaveAnswerRequest request)
    {
        var studentId = GetStudentId();
        var record = await _answerRepository.SaveAnswerAsync(
            studentId, taskId, request.PartIndex, request.PartCount, request.Answer);
        return Ok(record);
    }

    [HttpGet("me/tasks/{taskId}/state")]
    public async Task<ActionResult<TaskSetState>> GetTaskSetState(string taskId)
    {
        var studentId = GetStudentId();
        var state = await _answerRepository.LoadTaskSetStateAsync(studentId, taskId);
        return new JsonResult(state);
    }

    [HttpPost("me/tasks/{taskId}/state")]
    public async Task<ActionResult<TaskSetState>> SaveQuestionAnswer(
        string taskId, [FromBody] SaveQuestionAnswerRequest request)
    {
        var studentId = GetStudentId();
        var state = await _answerRepository.SaveQuestionAnswerAsync(
            studentId, taskId, request.PartIndex, request.QuestionIndex,
            request.Answer, request.Validated, request.Status);
        return Ok(state);
    }
}

public class SaveAnswerRequest
{
    public int PartIndex { get; set; }
    public int PartCount { get; set; }
    public string Answer { get; set; } = string.Empty;
}

public class SaveQuestionAnswerRequest
{
    public int PartIndex { get; set; }
    public int QuestionIndex { get; set; }
    public string Answer { get; set; } = string.Empty;
    public bool Validated { get; set; }
    public string Status { get; set; } = "neutral";
}
