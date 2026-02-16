using MatBackend.Core.Interfaces;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace MatBackend.Infrastructure.Repositories;

public class YamlTaskRepository : ITaskRepository
{
    private readonly string _tasksRoot;
    private readonly string _taskTypesRoot;
    private readonly IDeserializer _deserializer;

    public YamlTaskRepository(string tasksRoot, string taskTypesRoot)
    {
        _tasksRoot = tasksRoot;
        _taskTypesRoot = taskTypesRoot;
        _deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();
    }

    public async Task<string?> GetCorrectAnswerAsync(string taskId, int questionIndex)
    {
        var filePath = Path.Combine(_tasksRoot, $"{taskId}.yaml");
        if (!File.Exists(filePath)) return null;

        var content = await File.ReadAllTextAsync(filePath);
        var taskData = _deserializer.Deserialize<TaskYamlModel>(content);

        if (taskData.Questions == null || questionIndex < 0 || questionIndex >= taskData.Questions.Count)
        {
            return null;
        }

        return taskData.Questions[questionIndex].Answer;
    }

    public async Task<(string Category, string SubCategory, string Difficulty)?> GetTaskMetadataAsync(string taskId)
    {
        var taskFilePath = Path.Combine(_tasksRoot, $"{taskId}.yaml");
        if (!File.Exists(taskFilePath)) return null;

        var taskContent = await File.ReadAllTextAsync(taskFilePath);
        var taskData = _deserializer.Deserialize<TaskYamlModel>(taskContent);
        
        if (string.IsNullOrEmpty(taskData.Type)) return null;

        var typeFilePath = Path.Combine(_taskTypesRoot, $"{taskData.Type}.yaml");
        if (!File.Exists(typeFilePath)) 
        {
            return (taskData.Type, "unknown", "unknown");
        }

        var typeContent = await File.ReadAllTextAsync(typeFilePath);
        var typeData = _deserializer.Deserialize<TaskTypeYamlModel>(typeContent);

        return (typeData.Category, typeData.Subcategory, typeData.Difficulty);
    }
    
    public async Task<IEnumerable<TaskTypeInfo>> GetTaskTypesAsync()
    {
        var taskTypes = new List<TaskTypeInfo>();
        
        if (!Directory.Exists(_taskTypesRoot))
            return taskTypes;
        
        var yamlFiles = Directory.GetFiles(_taskTypesRoot, "*.yaml");
        
        foreach (var file in yamlFiles)
        {
            try
            {
                var content = await File.ReadAllTextAsync(file);
                var typeData = _deserializer.Deserialize<TaskTypeYamlModelExtended>(content);
                
                taskTypes.Add(new TaskTypeInfo(
                    typeData.Id ?? Path.GetFileNameWithoutExtension(file),
                    typeData.Name ?? typeData.Id ?? Path.GetFileNameWithoutExtension(file),
                    typeData.Category ?? "unknown",
                    typeData.Subcategory ?? "unknown",
                    typeData.Difficulty ?? "middel"
                ));
            }
            catch
            {
                // Skip files that can't be parsed
            }
        }
        
        return taskTypes;
    }
    
    private class TaskYamlModel
    {
        public string Type { get; set; } = string.Empty;
        public List<QuestionYamlModel> Questions { get; set; } = new();
    }

    private class QuestionYamlModel
    {
        public string Answer { get; set; } = string.Empty;
    }

    private class TaskTypeYamlModel
    {
        public string Category { get; set; } = string.Empty;
        public string Subcategory { get; set; } = string.Empty;
        public string Difficulty { get; set; } = string.Empty;
    }
    
    private class TaskTypeYamlModelExtended
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public string? Subcategory { get; set; }
        public string? Difficulty { get; set; }
    }
}

