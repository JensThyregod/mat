using MatBackend.Core.Models;

namespace MatBackend.Core.Interfaces;

public interface IAnswerRepository
{
    Task<Dictionary<string, List<AnswerRecord>>> GetAnswersForStudentAsync(string studentId);
    Task<AnswerRecord> SaveAnswerAsync(string studentId, string taskId, int partIndex, int partCount, string answer);
    Task<TaskSetState?> LoadTaskSetStateAsync(string studentId, string taskId);
    Task<TaskSetState> SaveQuestionAnswerAsync(
        string studentId, string taskId, int partIndex, int questionIndex,
        string answer, bool validated, string status);
}
