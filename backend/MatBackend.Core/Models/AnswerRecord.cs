namespace MatBackend.Core.Models;

public class AnswerRecord
{
    public string TaskId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public int? PartIndex { get; set; }
    public int? PartCount { get; set; }
}

public class QuestionAnswerState
{
    public string Answer { get; set; } = string.Empty;
    public bool Validated { get; set; }
    public string Status { get; set; } = "neutral";
    public string UpdatedAt { get; set; } = string.Empty;
}

public class TaskSetState
{
    public string TaskId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public Dictionary<int, Dictionary<int, QuestionAnswerState>> Parts { get; set; } = new();
    public string UpdatedAt { get; set; } = string.Empty;
}
