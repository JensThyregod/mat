using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace MatBackend.Infrastructure.Services;

public class TaskSetService : ITaskSetService
{
    private readonly string _tasksRoot;
    private readonly IDeserializer _deserializer;

    private static readonly List<TaskSetDefinition> TaskSets = new()
    {
        new TaskSetDefinition
        {
            Id = "demo-set",
            Title = "Demo sæt · Brøker og geometri",
            TaskIds = new List<string>
            {
                "tal_broeker_001", "tal_broeker_002",
                "geo_vinkelsum_001", "geo_sammensat_001", "geo_sammensat_002"
            }
        },
        new TaskSetDefinition
        {
            Id = "fp9-traening",
            Title = "FP9 Træningssæt · Uden hjælpemidler",
            TaskIds = new List<string>
            {
                "tal_pris_rabat_001", "tal_forholdstalsregning_001",
                "tal_regnearter_001", "tal_ligninger_001",
                "geo_enhedsomregning_001", "geo_projektioner_001",
                "stat_soejlediagram_001", "stat_boksplot_001", "stat_sandsynlighed_001"
            }
        }
    };

    private static readonly Dictionary<string, List<string>> UserAssignments = new()
    {
        ["test"] = new List<string> { "demo-set", "fp9-traening" }
    };

    public TaskSetService(string tasksRoot)
    {
        _tasksRoot = tasksRoot;
        _deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();
    }

    public async Task<List<TaskDto>> GetTasksForStudentAsync(string studentId)
    {
        if (!UserAssignments.TryGetValue(studentId, out var setIds))
            return new List<TaskDto>();

        var tasks = new List<TaskDto>();
        foreach (var setId in setIds)
        {
            var set = TaskSets.Find(s => s.Id == setId);
            if (set == null) continue;

            var dto = await BuildTaskSetDto(set);
            if (dto != null) tasks.Add(dto);
        }
        return tasks;
    }

    public async Task<TaskDto?> GetTaskForStudentAsync(string studentId, string taskId)
    {
        var all = await GetTasksForStudentAsync(studentId);
        return all.Find(t => t.Id == taskId);
    }

    private async Task<TaskDto?> BuildTaskSetDto(TaskSetDefinition set)
    {
        var parts = new List<string>();

        foreach (var taskId in set.TaskIds)
        {
            var instance = await LoadTaskInstance(taskId);
            if (instance == null) continue;

            var questionsLatex = string.Join("\n  ",
                instance.Questions.Select(q =>
                {
                    var alts = q.AcceptAlternatives != null && q.AcceptAlternatives.Count > 0
                        ? "|" + string.Join("|", q.AcceptAlternatives)
                        : "";
                    return $"\\item {q.Text} %% ANS: {q.Answer}{alts}";
                }));

            parts.Add($@"\section*{{{instance.Title}}}
{instance.Intro}

\begin{{enumerate}}[label=\textbf{{\arabic*.}}]
  {questionsLatex}
\end{{enumerate}}");
        }

        if (parts.Count == 0) return null;

        return new TaskDto
        {
            Id = set.Id,
            Title = set.Title,
            Latex = parts[0],
            Parts = parts,
            Tags = new List<string> { "taskset" },
            Difficulty = "medium"
        };
    }

    private async Task<TaskInstanceYaml?> LoadTaskInstance(string taskId)
    {
        var path = Path.Combine(_tasksRoot, $"{taskId}.yaml");
        if (!File.Exists(path)) return null;

        var content = await File.ReadAllTextAsync(path);
        return _deserializer.Deserialize<TaskInstanceYaml>(content);
    }

    private class TaskSetDefinition
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public List<string> TaskIds { get; set; } = new();
    }

    private class TaskInstanceYaml
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Intro { get; set; } = string.Empty;
        public List<QuestionYaml> Questions { get; set; } = new();
    }

    private class QuestionYaml
    {
        public string Text { get; set; } = string.Empty;
        public string Answer { get; set; } = string.Empty;
        public string AnswerType { get; set; } = string.Empty;
        public List<string>? AcceptAlternatives { get; set; }
    }
}
