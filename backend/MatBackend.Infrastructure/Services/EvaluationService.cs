using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;

namespace MatBackend.Infrastructure.Services;

public class EvaluationService : IEvaluationService
{
    private readonly ITaskRepository _taskRepository;

    public EvaluationService(ITaskRepository taskRepository)
    {
        _taskRepository = taskRepository;
    }

    public async Task<List<EvaluationResult>> EvaluateSubmissionAsync(TaskSubmission submission)
    {
        var results = new List<EvaluationResult>();

        foreach (var answer in submission.Answers)
        {
            var correctAnswer = await _taskRepository.GetCorrectAnswerAsync(answer.TaskId, answer.QuestionIndex);
            
            var result = new EvaluationResult();
            
            if (correctAnswer == null)
            {
                result.IsCorrect = false;
                result.Feedback = "Question not found.";
            }
            else
            {
                // Simple string comparison for now.
                result.IsCorrect = Normalize(answer.GivenAnswer) == Normalize(correctAnswer);
                result.CorrectAnswer = correctAnswer;
                
                if (result.IsCorrect)
                {
                    result.Feedback = "Correct!";
                }
                else
                {
                    result.Feedback = $"Incorrect. The correct answer was {correctAnswer}.";
                }
            }
            results.Add(result);
        }

        return results;
    }

    private string Normalize(string input)
    {
        if (input == null) return string.Empty;
        return input.Trim().ToLowerInvariant().Replace(",", ".");
    }
}

