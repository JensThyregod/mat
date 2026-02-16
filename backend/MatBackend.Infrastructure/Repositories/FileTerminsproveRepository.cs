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

    private string GetTerminsproverDirectory(string? studentId = null)
    {
        if (!string.IsNullOrEmpty(studentId))
        {
            return Path.Combine(_dataRoot, "users", studentId, "terminsprover");
        }
        return Path.Combine(_dataRoot, "terminsprover");
    }

    private string GetFilePath(string id, string? studentId = null)
    {
        return Path.Combine(GetTerminsproverDirectory(studentId), $"{id}.json");
    }

    public async Task SaveAsync(TerminsproveResult terminsprove)
    {
        var directory = GetTerminsproverDirectory(terminsprove.Request.StudentId);
        
        if (!Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var filePath = GetFilePath(terminsprove.Id, terminsprove.Request.StudentId);
        var json = JsonSerializer.Serialize(terminsprove, _jsonOptions);
        await File.WriteAllTextAsync(filePath, json);
        
        // Also save the full agent chat history as a human-readable log file
        await SaveAgentChatLogAsync(terminsprove);
    }
    
    /// <summary>
    /// Saves the full agent chat history (all prompts, responses, and metadata) 
    /// to a human-readable text file in data/agent-logs/{terminsproveId}.txt
    /// </summary>
    private async Task SaveAgentChatLogAsync(TerminsproveResult terminsprove)
    {
        try
        {
            var logDir = Path.Combine(_dataRoot, "agent-logs");
            if (!Directory.Exists(logDir))
                Directory.CreateDirectory(logDir);
            
            var logPath = Path.Combine(logDir, $"{terminsprove.Id}.txt");
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
        // First check global terminsprover directory
        var globalPath = GetFilePath(id);
        if (File.Exists(globalPath))
        {
            var json = await File.ReadAllTextAsync(globalPath);
            return JsonSerializer.Deserialize<TerminsproveResult>(json, _jsonOptions);
        }

        // Search in user directories
        var usersDir = Path.Combine(_dataRoot, "users");
        if (Directory.Exists(usersDir))
        {
            foreach (var userDir in Directory.GetDirectories(usersDir))
            {
                var userTerminsproverDir = Path.Combine(userDir, "terminsprover");
                var userPath = Path.Combine(userTerminsproverDir, $"{id}.json");
                
                if (File.Exists(userPath))
                {
                    var json = await File.ReadAllTextAsync(userPath);
                    return JsonSerializer.Deserialize<TerminsproveResult>(json, _jsonOptions);
                }
            }
        }

        return null;
    }

    public async Task<IEnumerable<TerminsproveResult>> GetAllAsync(string? studentId = null)
    {
        var results = new List<TerminsproveResult>();

        if (!string.IsNullOrEmpty(studentId))
        {
            // Get terminsprøver for specific student
            var directory = GetTerminsproverDirectory(studentId);
            if (Directory.Exists(directory))
            {
                await LoadFromDirectoryAsync(directory, results);
            }
        }
        else
        {
            // Get all terminsprøver from global directory
            var globalDir = GetTerminsproverDirectory();
            if (Directory.Exists(globalDir))
            {
                await LoadFromDirectoryAsync(globalDir, results);
            }

            // Also search all user directories
            var usersDir = Path.Combine(_dataRoot, "users");
            if (Directory.Exists(usersDir))
            {
                foreach (var userDir in Directory.GetDirectories(usersDir))
                {
                    var userTerminsproverDir = Path.Combine(userDir, "terminsprover");
                    if (Directory.Exists(userTerminsproverDir))
                    {
                        await LoadFromDirectoryAsync(userTerminsproverDir, results);
                    }
                }
            }
        }

        return results.OrderByDescending(t => t.Metadata.StartedAt);
    }

    private async Task LoadFromDirectoryAsync(string directory, List<TerminsproveResult> results)
    {
        foreach (var file in Directory.GetFiles(directory, "*.json"))
        {
            try
            {
                var json = await File.ReadAllTextAsync(file);
                var terminsprove = JsonSerializer.Deserialize<TerminsproveResult>(json, _jsonOptions);
                if (terminsprove != null)
                {
                    results.Add(terminsprove);
                }
            }
            catch (JsonException)
            {
                // Skip invalid JSON files
            }
        }
    }

    public Task<bool> DeleteAsync(string id)
    {
        // Check global directory first
        var globalPath = GetFilePath(id);
        if (File.Exists(globalPath))
        {
            File.Delete(globalPath);
            return Task.FromResult(true);
        }

        // Search in user directories
        var usersDir = Path.Combine(_dataRoot, "users");
        if (Directory.Exists(usersDir))
        {
            foreach (var userDir in Directory.GetDirectories(usersDir))
            {
                var userPath = Path.Combine(userDir, "terminsprover", $"{id}.json");
                if (File.Exists(userPath))
                {
                    File.Delete(userPath);
                    return Task.FromResult(true);
                }
            }
        }

        return Task.FromResult(false);
    }
}

