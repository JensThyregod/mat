using System.Text;
using System.Text.Json;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Infrastructure.Repositories;

public class FileTerminsproveRepository : ITerminsproveRepository
{
    private readonly string _dataRoot;
    private readonly JsonSerializerOptions _jsonOptions;

    public FileTerminsproveRepository(string dataRoot)
    {
        _dataRoot = dataRoot;
        _jsonOptions = new JsonSerializerOptions 
        { 
            WriteIndented = true,
            PropertyNameCaseInsensitive = true 
        };
    }

    private string GetTerminsproverBaseDirectory(string? studentId = null)
    {
        if (!string.IsNullOrEmpty(studentId))
        {
            return Path.Combine(_dataRoot, "users", studentId, "terminsprover");
        }
        return Path.Combine(_dataRoot, "terminsprover");
    }

    /// <summary>
    /// Build the folder name for a terminsprøve: "yyyy-MM-dd_HH-mm-ss_{id}"
    /// </summary>
    internal static string BuildFolderName(TerminsproveResult terminsprove)
    {
        var timestamp = terminsprove.Metadata.StartedAt != default
            ? terminsprove.Metadata.StartedAt
            : DateTime.UtcNow;
        return $"{timestamp:yyyy-MM-dd_HH-mm-ss}_{terminsprove.Id}";
    }

    /// <summary>
    /// Get the dedicated folder for a single terminsprøve.
    /// All content (JSON, agent log, images) lives inside this folder.
    /// </summary>
    public string GetTerminsproveFolderPath(TerminsproveResult terminsprove)
    {
        var baseDir = GetTerminsproverBaseDirectory(terminsprove.Request.StudentId);
        return Path.Combine(baseDir, BuildFolderName(terminsprove));
    }

    /// <summary>
    /// Find the folder for a terminsprøve by its ID.
    /// Scans directory names that end with the given ID.
    /// </summary>
    private string? FindFolderById(string id, string? studentId = null)
    {
        var baseDir = GetTerminsproverBaseDirectory(studentId);
        if (!Directory.Exists(baseDir))
            return null;

        var suffix = $"_{id}";
        return Directory.GetDirectories(baseDir)
            .FirstOrDefault(d => Path.GetFileName(d).EndsWith(suffix));
    }

    public async Task SaveAsync(TerminsproveResult terminsprove)
    {
        var folder = GetTerminsproveFolderPath(terminsprove);
        Directory.CreateDirectory(folder);

        var filePath = Path.Combine(folder, "terminsprove.json");
        var json = JsonSerializer.Serialize(terminsprove, _jsonOptions);
        await File.WriteAllTextAsync(filePath, json);
        
        await SaveAgentChatLogAsync(terminsprove, folder);
    }
    
    /// <summary>
    /// Saves the full agent chat history to agent-log.txt inside the terminsprøve folder.
    /// </summary>
    private async Task SaveAgentChatLogAsync(TerminsproveResult terminsprove, string folder)
    {
        try
        {
            var logPath = Path.Combine(folder, "agent-log.txt");
            var sb = new StringBuilder();
            
            // Header
            sb.AppendLine("╔══════════════════════════════════════════════════════════════════╗");
            sb.AppendLine("║              TERMINSPRØVE AGENT CHAT LOG                        ║");
            sb.AppendLine("╚══════════════════════════════════════════════════════════════════╝");
            sb.AppendLine();
            sb.AppendLine($"  ID:         {terminsprove.Id}");
            sb.AppendLine($"  Status:     {terminsprove.Status}");
            sb.AppendLine($"  Started:    {terminsprove.Metadata.StartedAt:yyyy-MM-dd HH:mm:ss} UTC");
            sb.AppendLine($"  Completed:  {terminsprove.Metadata.CompletedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A"} UTC");
            sb.AppendLine($"  Duration:   {terminsprove.Metadata.Duration?.TotalSeconds:F1}s");
            sb.AppendLine($"  Tasks:      {terminsprove.Tasks.Count} generated");
            sb.AppendLine($"  Iterations: {terminsprove.Metadata.TotalIterations}");
            if (!string.IsNullOrEmpty(terminsprove.ErrorMessage))
                sb.AppendLine($"  Error:      {terminsprove.ErrorMessage}");
            sb.AppendLine();
            
            // Request details
            sb.AppendLine("──────────────────────────────────────────────────────────────────");
            sb.AppendLine("  REQUEST");
            sb.AppendLine("──────────────────────────────────────────────────────────────────");
            var req = terminsprove.Request;
            sb.AppendLine($"  Level:        {req.Level}");
            sb.AppendLine($"  ExamPart:     {req.ExamPart}");
            sb.AppendLine($"  TaskCount:    {req.TaskCount}");
            sb.AppendLine($"  Difficulty:   {req.Difficulty.Easy:P0} easy / {req.Difficulty.Medium:P0} medium / {req.Difficulty.Hard:P0} hard");
            sb.AppendLine($"  Categories:   [{string.Join(", ", req.FocusCategories)}]");
            if (!string.IsNullOrEmpty(req.CustomInstructions))
                sb.AppendLine($"  Custom:       {req.CustomInstructions}");
            sb.AppendLine();
            
            // Agent log entries — the full chat history
            sb.AppendLine("══════════════════════════════════════════════════════════════════");
            sb.AppendLine("  AGENT CHAT HISTORY");
            sb.AppendLine("══════════════════════════════════════════════════════════════════");
            sb.AppendLine();
            
            for (int i = 0; i < terminsprove.AgentLog.Count; i++)
            {
                var entry = terminsprove.AgentLog[i];
                sb.AppendLine($"┌─ [{i + 1}/{terminsprove.AgentLog.Count}] {entry.AgentName} ─ {entry.Action}");
                sb.AppendLine($"│  Timestamp: {entry.Timestamp:yyyy-MM-dd HH:mm:ss.fff} UTC");
                sb.AppendLine($"│  Duration:  {entry.Duration?.TotalMilliseconds:F0}ms");
                if (entry.ParsedTaskCount.HasValue)
                    sb.AppendLine($"│  Parsed:    {entry.ParsedTaskCount} tasks (success={entry.ParseSuccess})");
                if (!string.IsNullOrEmpty(entry.ErrorMessage))
                    sb.AppendLine($"│  ERROR:     {entry.ErrorMessage}");
                sb.AppendLine("│");
                
                // Full input (system prompt + user prompt)
                if (!string.IsNullOrEmpty(entry.Input))
                {
                    sb.AppendLine("│  ┌── INPUT (prompt sent to LLM) ──────────────────────────────");
                    foreach (var line in entry.Input.Split('\n'))
                        sb.AppendLine($"│  │ {line.TrimEnd('\r')}");
                    sb.AppendLine("│  └───────────────────────────────────────────────────────────");
                    sb.AppendLine("│");
                }
                
                // Full output (raw LLM response)
                if (!string.IsNullOrEmpty(entry.Output))
                {
                    sb.AppendLine("│  ┌── OUTPUT (raw LLM response) ───────────────────────────────");
                    foreach (var line in entry.Output.Split('\n'))
                        sb.AppendLine($"│  │ {line.TrimEnd('\r')}");
                    sb.AppendLine("│  └───────────────────────────────────────────────────────────");
                }
                
                sb.AppendLine("└──────────────────────────────────────────────────────────────");
                sb.AppendLine();
            }
            
            // Generated tasks summary
            sb.AppendLine("══════════════════════════════════════════════════════════════════");
            sb.AppendLine("  GENERATED TASKS SUMMARY");
            sb.AppendLine("══════════════════════════════════════════════════════════════════");
            sb.AppendLine();
            
            for (int i = 0; i < terminsprove.Tasks.Count; i++)
            {
                var task = terminsprove.Tasks[i];
                sb.AppendLine($"  Task {i + 1}: [{task.TaskTypeId}] ({task.Difficulty})");
                sb.AppendLine($"    Category: {task.Category}");
                sb.AppendLine($"    Context:  {task.ContextText}");
                sb.AppendLine($"    Points:   {task.Points}");
                if (!string.IsNullOrEmpty(task.ImageUrl))
                    sb.AppendLine($"    Image:    {task.ImageUrl}");
                if (task.Visualization != null && task.Visualization.Type != "none")
                    sb.AppendLine($"    Viz:      {task.Visualization.Type}");
                
                foreach (var sq in task.SubQuestions)
                {
                    sb.AppendLine($"    {sq.Label}) {sq.QuestionText}");
                    sb.AppendLine($"       Answer: {sq.Answer?.Value} {sq.Answer?.Unit}");
                }
                sb.AppendLine();
            }
            
            // Metadata
            sb.AppendLine("──────────────────────────────────────────────────────────────────");
            sb.AppendLine("  STATISTICS");
            sb.AppendLine("──────────────────────────────────────────────────────────────────");
            if (terminsprove.Metadata.CategoryDistribution.Any())
            {
                sb.AppendLine("  Categories:");
                foreach (var (cat, count) in terminsprove.Metadata.CategoryDistribution)
                    sb.AppendLine($"    {cat}: {count}");
            }
            if (terminsprove.Metadata.DifficultyDistribution.Any())
            {
                sb.AppendLine("  Difficulty:");
                foreach (var (diff, count) in terminsprove.Metadata.DifficultyDistribution)
                    sb.AppendLine($"    {diff}: {count}");
            }
            sb.AppendLine($"  Regenerated tasks: {terminsprove.Metadata.RegeneratedTaskCount}");
            sb.AppendLine();
            sb.AppendLine("═══════════════════════════════════════════════════════════════ END");
            
            await File.WriteAllTextAsync(logPath, sb.ToString());
        }
        catch
        {
            // Don't let log writing failures break the main save
        }
    }

    public async Task<TerminsproveResult?> GetByIdAsync(string id)
    {
        // Search global terminsprover directory for a folder ending with _{id}
        var folder = FindFolderById(id);
        if (folder != null)
        {
            return await LoadFromFolderAsync(folder);
        }

        // Search in user directories
        var usersDir = Path.Combine(_dataRoot, "users");
        if (Directory.Exists(usersDir))
        {
            foreach (var userDir in Directory.GetDirectories(usersDir))
            {
                var userTerminsproverDir = Path.Combine(userDir, "terminsprover");
                if (!Directory.Exists(userTerminsproverDir)) continue;
                
                var suffix = $"_{id}";
                var match = Directory.GetDirectories(userTerminsproverDir)
                    .FirstOrDefault(d => Path.GetFileName(d).EndsWith(suffix));
                
                if (match != null)
                    return await LoadFromFolderAsync(match);
            }
        }

        return null;
    }

    public async Task<IEnumerable<TerminsproveResult>> GetAllAsync(string? studentId = null)
    {
        var results = new List<TerminsproveResult>();

        if (!string.IsNullOrEmpty(studentId))
        {
            var directory = GetTerminsproverBaseDirectory(studentId);
            if (Directory.Exists(directory))
            {
                await LoadAllFromBaseDirectoryAsync(directory, results);
            }
        }
        else
        {
            var globalDir = GetTerminsproverBaseDirectory();
            if (Directory.Exists(globalDir))
            {
                await LoadAllFromBaseDirectoryAsync(globalDir, results);
            }

            var usersDir = Path.Combine(_dataRoot, "users");
            if (Directory.Exists(usersDir))
            {
                foreach (var userDir in Directory.GetDirectories(usersDir))
                {
                    var userTerminsproverDir = Path.Combine(userDir, "terminsprover");
                    if (Directory.Exists(userTerminsproverDir))
                    {
                        await LoadAllFromBaseDirectoryAsync(userTerminsproverDir, results);
                    }
                }
            }
        }

        return results.OrderByDescending(t => t.Metadata.StartedAt);
    }

    private async Task<TerminsproveResult?> LoadFromFolderAsync(string folder)
    {
        var jsonPath = Path.Combine(folder, "terminsprove.json");
        if (!File.Exists(jsonPath))
            return null;

        try
        {
            var json = await File.ReadAllTextAsync(jsonPath);
            return JsonSerializer.Deserialize<TerminsproveResult>(json, _jsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private async Task LoadAllFromBaseDirectoryAsync(string baseDirectory, List<TerminsproveResult> results)
    {
        foreach (var folder in Directory.GetDirectories(baseDirectory))
        {
            var result = await LoadFromFolderAsync(folder);
            if (result != null)
            {
                results.Add(result);
            }
        }
    }

    public string GetImagesFolderPath(TerminsproveResult terminsprove)
    {
        return Path.Combine(GetTerminsproveFolderPath(terminsprove), "images");
    }

    public Task<bool> DeleteAsync(string id)
    {
        // Find and delete the entire folder for this terminsprøve
        var folder = FindFolderById(id);
        if (folder != null)
        {
            Directory.Delete(folder, recursive: true);
            return Task.FromResult(true);
        }

        // Search in user directories
        var usersDir = Path.Combine(_dataRoot, "users");
        if (Directory.Exists(usersDir))
        {
            foreach (var userDir in Directory.GetDirectories(usersDir))
            {
                var userTerminsproverDir = Path.Combine(userDir, "terminsprover");
                if (!Directory.Exists(userTerminsproverDir)) continue;
                
                var suffix = $"_{id}";
                var match = Directory.GetDirectories(userTerminsproverDir)
                    .FirstOrDefault(d => Path.GetFileName(d).EndsWith(suffix));
                
                if (match != null)
                {
                    Directory.Delete(match, recursive: true);
                    return Task.FromResult(true);
                }
            }
        }

        return Task.FromResult(false);
    }
}

