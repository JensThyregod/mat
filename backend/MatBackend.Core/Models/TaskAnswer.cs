namespace MatBackend.Core.Models;

public class TaskAnswer
{
    public string TaskId { get; set; } = string.Empty; // e.g., tal_broeker_001
    public int QuestionIndex { get; set; }
    public string GivenAnswer { get; set; } = string.Empty;
    public double TimeSpentSeconds { get; set; }
}

