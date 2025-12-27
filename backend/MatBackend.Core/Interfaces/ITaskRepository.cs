namespace MatBackend.Core.Interfaces;

public interface ITaskRepository
{
    Task<string?> GetCorrectAnswerAsync(string taskId, int questionIndex);
    Task<(string Category, string SubCategory, string Difficulty)?> GetTaskMetadataAsync(string taskId);
}

