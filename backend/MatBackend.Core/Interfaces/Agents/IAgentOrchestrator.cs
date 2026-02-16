using System.Text.Json.Serialization;
using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Core.Interfaces.Agents;

/// <summary>
/// Orchestrates the multi-agent workflow for terminsprøve generation
/// </summary>
public interface IAgentOrchestrator
{
    /// <summary>
    /// Generate a complete terminsprøve using the agent pipeline
    /// </summary>
    Task<TerminsproveResult> GenerateTerminsproveAsync(
        TerminsproveRequest request,
        IProgress<GenerationProgress>? progress = null,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Regenerate a specific task that failed validation
    /// </summary>
    Task<GeneratedTask> RegenerateTaskAsync(
        GeneratedTask failedTask,
        ValidationResult validationResult,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Progress report for the generation process
/// </summary>
public class GenerationProgress
{
    public GenerationStatus Status { get; set; }
    public string Message { get; set; } = string.Empty;
    public int TasksCompleted { get; set; }
    public int TotalTasks { get; set; }
    public string? CurrentAgentName { get; set; }
    public double ProgressPercentage => TotalTasks > 0 ? (double)TasksCompleted / TotalTasks * 100 : 0;
    
    /// <summary>
    /// Event type for the streaming protocol
    /// </summary>
    public ProgressEventType EventType { get; set; } = ProgressEventType.Progress;
    
    /// <summary>
    /// Newly completed task (when EventType is TaskCompleted)
    /// </summary>
    public GeneratedTask? CompletedTask { get; set; }
    
    /// <summary>
    /// Index of the task in the overall set (1-based)
    /// </summary>
    public int? TaskIndex { get; set; }
    
    /// <summary>
    /// Current phase of task generation
    /// </summary>
    public TaskGenerationPhase? TaskPhase { get; set; }
    
    /// <summary>
    /// Task ID (used for image updates to match task by ID)
    /// </summary>
    public string? TaskId { get; set; }
    
    /// <summary>
    /// Image URL when EventType is TaskImageReady
    /// </summary>
    public string? ImageUrl { get; set; }
}

/// <summary>
/// Event types for streaming progress updates
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ProgressEventType
{
    Progress,           // General progress update
    PhaseStarted,       // A new phase has started (brainstorm, format, validate, visualize)
    TaskStarted,        // Started working on a specific task
    TaskFormatted,      // Task has been formatted
    TaskValidated,      // Task has been validated
    TaskVisualized,     // Task visualization is complete
    TaskCompleted,      // Task is fully complete and ready to display
    TaskImageGenerating, // Image generation has started for a task (show placeholder)
    TaskImageReady,     // Image generation is complete for a task (fill placeholder)
    TaskFailed,         // Task generation failed
    Completed,          // All tasks completed
    Error               // An error occurred
}

/// <summary>
/// Phases of individual task generation
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TaskGenerationPhase
{
    Brainstorming,
    Formatting,
    Validating,
    Visualizing,
    Complete
}

