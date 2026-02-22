using MatBackend.Core.Models.Curriculum;
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
    /// Images are saved into the imageOutputPath directory.
    /// Returns the result including filename and the prompt used, or null if generation failed.
    /// </summary>
    Task<ImageGenerationResult?> GenerateImageAsync(
        GeneratedTask task,
        string imageOutputPath,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Determine if a task would benefit from a generated illustration image
    /// </summary>
    Task<bool> ShouldGenerateImageAsync(
        GeneratedTask task,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of an image generation call, including the prompt sent to the image model.
/// </summary>
public class ImageGenerationResult
{
    public string FileName { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
}

/// <summary>
/// Topic brainstorm agent - takes a pair of sampled curriculum topics and brainstorms
/// a creative task concept that combines them. Can signal that a re-sample is needed
/// if the pair is truly incompatible.
/// </summary>
public interface ITopicBrainstormAgent : ITerminsproveAgent
{
    /// <summary>
    /// Given a topic pair, brainstorm a creative task concept that weaves both topics together.
    /// Returns a TaskConcept with a rich scenario description for the task generator.
    /// </summary>
    Task<TaskConcept> BrainstormConceptAsync(
        TopicPair topicPair,
        string difficulty,
        string examPart,
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
    
    /// <summary>
    /// Generate a single complete task in one dedicated LLM call.
    /// Each task gets its own call for higher quality scaffolded output.
    /// </summary>
    Task<SingleTaskGenerationResult> GenerateSingleTaskWithLogAsync(
        SingleTaskGenerationRequest request,
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
/// Request for generating a single task in its own LLM call
/// </summary>
public class SingleTaskGenerationRequest
{
    public string Level { get; set; } = "fp9";
    public string ExamPart { get; set; } = "uden_hjaelpemidler";
    public List<string> FocusCategories { get; set; } = new();
    public string Difficulty { get; set; } = "middel";
    public string? CustomInstructions { get; set; }
    public int TaskIndex { get; set; }
    
    /// <summary>
    /// Pre-brainstormed task concept from the TopicBrainstormAgent.
    /// When set, the task generator uses this concept instead of inventing its own.
    /// </summary>
    public TaskConcept? Concept { get; set; }
}

/// <summary>
/// Result of a single task generation including orchestration log
/// </summary>
public class SingleTaskGenerationResult
{
    public GeneratedTask? Task { get; set; }
    public AgentLogEntry LogEntry { get; set; } = new();
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

