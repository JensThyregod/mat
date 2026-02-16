namespace MatBackend.Core.Models.Terminsprove;

/// <summary>
/// Request to generate a new terminsprøve (term exam)
/// </summary>
public class TerminsproveRequest
{
    /// <summary>
    /// Target level (e.g., "fp9" for 9th grade final exam)
    /// </summary>
    public string Level { get; set; } = "fp9";
    
    /// <summary>
    /// Exam part: "uden_hjaelpemidler" or "med_hjaelpemidler"
    /// </summary>
    public string ExamPart { get; set; } = "uden_hjaelpemidler";
    
    /// <summary>
    /// Number of tasks to generate
    /// </summary>
    public int TaskCount { get; set; } = 20;
    
    /// <summary>
    /// Optional focus areas (categories to emphasize)
    /// </summary>
    public List<string> FocusCategories { get; set; } = new();
    
    /// <summary>
    /// Difficulty distribution: easy, medium, hard percentages
    /// </summary>
    public DifficultyDistribution Difficulty { get; set; } = new();
    
    /// <summary>
    /// Optional student ID to personalize based on weak areas
    /// </summary>
    public string? StudentId { get; set; }
    
    /// <summary>
    /// Custom instructions for the generation agents
    /// </summary>
    public string? CustomInstructions { get; set; }
}

public class DifficultyDistribution
{
    public double Easy { get; set; } = 0.3;
    public double Medium { get; set; } = 0.5;
    public double Hard { get; set; } = 0.2;
}

