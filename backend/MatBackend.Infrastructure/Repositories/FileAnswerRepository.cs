using System.Text.Json;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;

namespace MatBackend.Infrastructure.Repositories;

public class FileAnswerRepository : IAnswerRepository
{
    private readonly string _dataRoot;
    private static readonly JsonSerializerOptions ReadOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly JsonSerializerOptions WriteOptions = new() { WriteIndented = true };

    public FileAnswerRepository(string dataRoot)
    {
        _dataRoot = dataRoot;
    }

    public async Task<Dictionary<string, List<AnswerRecord>>> GetAnswersForStudentAsync(string studentId)
    {
        var path = AnswersPath(studentId);
        if (!File.Exists(path))
            return new Dictionary<string, List<AnswerRecord>>();

        var json = await File.ReadAllTextAsync(path);
        return JsonSerializer.Deserialize<Dictionary<string, List<AnswerRecord>>>(json, ReadOptions)
               ?? new Dictionary<string, List<AnswerRecord>>();
    }

    public async Task<AnswerRecord> SaveAnswerAsync(
        string studentId, string taskId, int partIndex, int partCount, string answer)
    {
        var answers = await GetAnswersForStudentAsync(studentId);

        var record = new AnswerRecord
        {
            TaskId = taskId,
            StudentId = studentId,
            Answer = answer,
            UpdatedAt = DateTime.UtcNow.ToString("o"),
            PartIndex = partIndex,
            PartCount = partCount
        };

        if (!answers.ContainsKey(taskId))
            answers[taskId] = new List<AnswerRecord>();

        var list = answers[taskId];
        while (list.Count <= partIndex)
            list.Add(null!);
        list[partIndex] = record;

        await WriteJsonAsync(AnswersPath(studentId), answers);
        return record;
    }

    public async Task<TaskSetState?> LoadTaskSetStateAsync(string studentId, string taskId)
    {
        var path = TaskStatePath(studentId, taskId);
        if (!File.Exists(path)) return null;

        var json = await File.ReadAllTextAsync(path);
        return JsonSerializer.Deserialize<TaskSetState>(json, ReadOptions);
    }

    public async Task<TaskSetState> SaveQuestionAnswerAsync(
        string studentId, string taskId, int partIndex, int questionIndex,
        string answer, bool validated, string status)
    {
        var existing = await LoadTaskSetStateAsync(studentId, taskId);
        var now = DateTime.UtcNow.ToString("o");

        var state = existing ?? new TaskSetState
        {
            TaskId = taskId,
            StudentId = studentId,
            Parts = new Dictionary<int, Dictionary<int, QuestionAnswerState>>(),
            UpdatedAt = now
        };

        if (!state.Parts.ContainsKey(partIndex))
            state.Parts[partIndex] = new Dictionary<int, QuestionAnswerState>();

        state.Parts[partIndex][questionIndex] = new QuestionAnswerState
        {
            Answer = answer,
            Validated = validated,
            Status = status,
            UpdatedAt = now
        };
        state.UpdatedAt = now;

        await WriteJsonAsync(TaskStatePath(studentId, taskId), state);
        return state;
    }

    private string AnswersPath(string studentId) =>
        Path.Combine(_dataRoot, "users", studentId, "answers.json");

    private string TaskStatePath(string studentId, string taskId) =>
        Path.Combine(_dataRoot, "users", studentId, "taskstate", $"{taskId}.json");

    private static async Task WriteJsonAsync<T>(string path, T data)
    {
        var dir = Path.GetDirectoryName(path);
        if (dir != null && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var json = JsonSerializer.Serialize(data, WriteOptions);
        await File.WriteAllTextAsync(path, json);
    }
}
