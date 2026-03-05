using MatBackend.Core.Models;

namespace MatBackend.Core.Interfaces;

public interface ITaskSetService
{
    Task<List<TaskDto>> GetTasksForStudentAsync(string studentId);
    Task<TaskDto?> GetTaskForStudentAsync(string studentId, string taskId);
}
