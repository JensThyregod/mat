namespace MatBackend.Core.Models;

public class TaskSubmission
{
    public string StudentId { get; set; } = string.Empty;
    public string TaskSetId { get; set; } = string.Empty;
    public List<TaskAnswer> Answers { get; set; } = new();
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}

