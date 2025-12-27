using MatBackend.Core.Models;

namespace MatBackend.Core.Interfaces;

public interface IEvaluationService
{
    Task<List<EvaluationResult>> EvaluateSubmissionAsync(TaskSubmission submission);
}

