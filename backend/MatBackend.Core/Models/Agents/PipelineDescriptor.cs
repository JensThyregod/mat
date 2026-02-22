namespace MatBackend.Core.Models.Agents;

/// <summary>
/// Describes an orchestration pipeline as a directed graph of steps.
/// Every IAgentOrchestrator must return one of these so the flow is
/// always documented in code and can be rendered as a diagram.
/// </summary>
public class PipelineDescriptor
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<PipelineStep> Steps { get; set; } = new();
}

/// <summary>
/// A single step (node) in the orchestration graph.
/// Edges are expressed via <see cref="DependsOn"/>: each entry
/// is the <see cref="AgentName"/> of a predecessor step.
/// </summary>
public class PipelineStep
{
    public string AgentName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Names of predecessor steps that must complete before this one starts.
    /// An empty list means this is an entry point.
    /// </summary>
    public List<string> DependsOn { get; set; } = new();

    /// <summary>
    /// True when this step runs concurrently with its siblings
    /// (e.g. multiple tasks processed via Task.WhenAll).
    /// </summary>
    public bool IsParallel { get; set; }

    /// <summary>
    /// True when this step only runs conditionally
    /// (e.g. visualization only for geometry/statistics tasks).
    /// </summary>
    public bool IsOptional { get; set; }

    /// <summary>
    /// True when this step is fire-and-forget / runs in the background
    /// while subsequent steps proceed.
    /// </summary>
    public bool IsBackground { get; set; }
}
