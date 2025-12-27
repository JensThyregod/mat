using MatBackend.Core.Models;

namespace MatBackend.Core.Interfaces;

public interface ISkillService
{
    Task UpdateStudentSkillsAsync(string studentId, List<TaskAnswer> answers, List<EvaluationResult> results);
}

