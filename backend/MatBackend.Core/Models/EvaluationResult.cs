namespace MatBackend.Core.Models;

public class EvaluationResult
{
    public bool IsCorrect { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public string CorrectAnswer { get; set; } = string.Empty;
}

