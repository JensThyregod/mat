namespace MatBackend.Core.Interfaces;

public interface ITaskRepository
{
    Task<string?> GetCorrectAnswerAsync(string taskId, int questionIndex);
    Task<(string Category, string SubCategory, string Difficulty)?> GetTaskMetadataAsync(string taskId);
    Task<IEnumerable<TaskTypeInfo>> GetTaskTypesAsync();
}

public record TaskTypeInfo(
    string Id,
    string Name,
    string Category,
    string SubCategory,
    string Difficulty);

