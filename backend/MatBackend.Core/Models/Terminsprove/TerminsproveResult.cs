using System.Text.Json.Serialization;

namespace MatBackend.Core.Models.Terminsprove;

/// <summary>
/// The result of the terminsprøve generation process
/// </summary>
public class TerminsproveResult
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    /// <summary>
    /// The original request
    /// </summary>
    public TerminsproveRequest Request { get; set; } = new();
    
    /// <summary>
    /// Generated tasks
    /// </summary>
    public List<GeneratedTask> Tasks { get; set; } = new();
    
    /// <summary>
    /// Generation metadata
    /// </summary>
    public GenerationMetadata Metadata { get; set; } = new();
    
    /// <summary>
    /// Agent orchestration log
    /// </summary>
    public List<AgentLogEntry> AgentLog { get; set; } = new();
    
    /// <summary>
    /// Overall status
    /// </summary>
    public GenerationStatus Status { get; set; } = GenerationStatus.Pending;
    
    /// <summary>
    /// Error message if generation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

public class GenerationMetadata
{
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public TimeSpan? Duration => CompletedAt.HasValue ? CompletedAt - StartedAt : null;
    
    /// <summary>
    /// Total tokens used across all agents
    /// </summary>
    public int TotalTokensUsed { get; set; }
    
    /// <summary>
    /// Number of agent iterations
    /// </summary>
    public int TotalIterations { get; set; }
    
    /// <summary>
    /// Tasks that were regenerated due to validation failures
    /// </summary>
    public int RegeneratedTaskCount { get; set; }
    
    /// <summary>
    /// Category distribution of generated tasks
    /// </summary>
    public Dictionary<string, int> CategoryDistribution { get; set; } = new();
    
    /// <summary>
    /// Difficulty distribution of generated tasks
    /// </summary>
    public Dictionary<string, int> DifficultyDistribution { get; set; } = new();
}

public class AgentLogEntry
{
    public DateTime Timestamp { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    
    /// <summary>
    /// Full input sent to the agent (system prompt + user prompt)
    /// </summary>
    public string? Input { get; set; }
    
    /// <summary>
    /// Raw output from the agent (the full LLM response)
    /// </summary>
    public string? Output { get; set; }
    
    public int? TokensUsed { get; set; }
    public TimeSpan? Duration { get; set; }
    
    /// <summary>
    /// Number of tasks successfully parsed from this agent call
    /// </summary>
    public int? ParsedTaskCount { get; set; }
    
    /// <summary>
    /// Whether the JSON parsing succeeded without falling back
    /// </summary>
    public bool? ParseSuccess { get; set; }
    
    /// <summary>
    /// Any error message if the agent call failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GenerationStatus
{
    Pending,
    Brainstorming,
    Formatting,
    Validating,
    Visualizing,
    Completed,
    Failed
}

