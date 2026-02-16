using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Core.Interfaces.Agents;

/// <summary>
/// Base interface for all terminsprøve generation agents
/// </summary>
public interface ITerminsproveAgent
{
    /// <summary>
    /// Agent name for logging and identification
    /// </summary>
    string Name { get; }
    
    /// <summary>
    /// Agent description
    /// </summary>
    string Description { get; }
}

/// <summary>
/// Brainstorm agent - generates initial task ideas and structures
/// </summary>
public interface IBrainstormAgent : ITerminsproveAgent
{
    /// <summary>
    /// Generate task ideas based on the request
    /// </summary>
    Task<List<TaskIdea>> BrainstormTasksAsync(
        TerminsproveRequest request,
        IEnumerable<string> availableTaskTypes,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Formatter agent - takes task ideas and creates properly formatted tasks
/// </summary>
public interface IFormatterAgent : ITerminsproveAgent
{
    /// <summary>
    /// Format a task idea into a complete generated task
    /// </summary>
    Task<GeneratedTask> FormatTaskAsync(
        TaskIdea idea,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Format multiple task ideas
    /// </summary>
    Task<List<GeneratedTask>> FormatTasksAsync(
        IEnumerable<TaskIdea> ideas,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Validator agent - ensures tasks are solvable and appropriate
/// </summary>
public interface IValidatorAgent : ITerminsproveAgent
{
    /// <summary>
    /// Validate a generated task
    /// </summary>
    Task<ValidationResult> ValidateTaskAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validate all tasks in a terminsprøve
    /// </summary>
    Task<List<(GeneratedTask Task, ValidationResult Result)>> ValidateTasksAsync(
        IEnumerable<GeneratedTask> tasks,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Visualization agent - creates figures and charts for tasks
/// </summary>
public interface IVisualizationAgent : ITerminsproveAgent
{
    /// <summary>
    /// Create visualization for a task if needed
    /// </summary>
    Task<TaskVisualization?> CreateVisualizationAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Determine if a task needs visualization
    /// </summary>
    Task<bool> NeedsVisualizationAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Image generation agent - creates illustrative images for tasks using AI image generation (e.g. Gemini)
/// </summary>
public interface IImageGenerationAgent : ITerminsproveAgent
{
    /// <summary>
    /// Generate an illustration image for a task based on its context.
    /// Returns the URL path to the generated image, or null if generation failed.
    /// </summary>
    Task<string?> GenerateImageAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Determine if a task would benefit from a generated illustration image
    /// </summary>
    Task<bool> ShouldGenerateImageAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Optimized batch generator - generates complete tasks in batches (3-5x faster)
/// Combines brainstorming, formatting, and validation in a single LLM call
/// </summary>
public interface IBatchTaskGeneratorAgent : ITerminsproveAgent
{
    /// <summary>
    /// Generate a batch of complete, validated tasks in a single LLM call
    /// </summary>
    Task<List<GeneratedTask>> GenerateBatchAsync(
        BatchGenerationRequest request,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate a batch with full orchestration logging (raw prompts + responses)
    /// </summary>
    Task<BatchGenerationResult> GenerateBatchWithLogAsync(
        BatchGenerationRequest request,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of a batch generation including orchestration log
/// </summary>
public class BatchGenerationResult
{
    public List<GeneratedTask> Tasks { get; set; } = new();
    public AgentLogEntry LogEntry { get; set; } = new();
}

/// <summary>
/// Request for batch task generation
/// </summary>
public class BatchGenerationRequest
{
    public int Count { get; set; } = 5;
    public string Level { get; set; } = "fp9";
    public string ExamPart { get; set; } = "uden_hjaelpemidler";
    public List<string> FocusCategories { get; set; } = new();
    public DifficultyDistribution Difficulty { get; set; } = new();
    public string? CustomInstructions { get; set; }
    public int BatchIndex { get; set; }
}

/// <summary>
/// Task idea from the brainstorm phase
/// </summary>
public class TaskIdea
{
    public string TaskTypeId { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "middel";
    public string QuestionConcept { get; set; } = string.Empty;
    public Dictionary<string, object> SuggestedVariables { get; set; } = new();
    public bool RequiresVisualization { get; set; }
    public string? VisualizationType { get; set; }
    public string Rationale { get; set; } = string.Empty;
}

