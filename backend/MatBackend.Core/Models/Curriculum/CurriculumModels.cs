namespace MatBackend.Core.Models.Curriculum;

/// <summary>
/// A single topic from the FP9 curriculum (e.g. "Lineære funktioner", "Pythagoras' sætning")
/// </summary>
public class CurriculumTopic
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = new();
    
    /// <summary>
    /// Parent category ID (tal_og_algebra, geometri_og_maaling, statistik_og_sandsynlighed)
    /// </summary>
    public string CategoryId { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    
    /// <summary>
    /// Parent subcategory (e.g. "Talforståelse", "Algebra", "Funktioner")
    /// </summary>
    public string SubcategoryId { get; set; } = string.Empty;
    public string SubcategoryName { get; set; } = string.Empty;
}

/// <summary>
/// A pair of two randomly sampled curriculum topics that a task should combine.
/// </summary>
public class TopicPair
{
    public CurriculumTopic Topic1 { get; set; } = null!;
    public CurriculumTopic Topic2 { get; set; } = null!;
    
    /// <summary>
    /// Whether this pair is flagged as potentially difficult to combine
    /// </summary>
    public bool IsDifficultCombination { get; set; }
    
    public override string ToString() =>
        $"{Topic1.Name} ({Topic1.CategoryName}) + {Topic2.Name} ({Topic2.CategoryName})";
}

/// <summary>
/// The brainstorm agent's output: a creative task concept built from a topic pair.
/// </summary>
public class TaskConcept
{
    /// <summary>
    /// The topic pair that inspired this concept
    /// </summary>
    public TopicPair TopicPair { get; set; } = null!;
    
    /// <summary>
    /// A rich scenario description (2-4 sentences) that the task generator should use
    /// </summary>
    public string ScenarioDescription { get; set; } = string.Empty;
    
    /// <summary>
    /// How the two topics connect mathematically in this scenario
    /// </summary>
    public string MathematicalConnection { get; set; } = string.Empty;
    
    /// <summary>
    /// Suggested task type ID (from the existing type system)
    /// </summary>
    public string SuggestedTaskTypeId { get; set; } = string.Empty;
    
    /// <summary>
    /// The primary category for the task
    /// </summary>
    public string PrimaryCategory { get; set; } = string.Empty;
    
    /// <summary>
    /// Whether a re-sample was needed (original pair was incompatible or far-fetched)
    /// </summary>
    public bool WasResampled { get; set; }
    
    /// <summary>
    /// How many times the topic pair was resampled before a good concept was found
    /// </summary>
    public int ResampleCount { get; set; }
    
    /// <summary>
    /// Reason for the last resample (for logging/diagnostics)
    /// </summary>
    public string? ResampleReason { get; set; }
}
