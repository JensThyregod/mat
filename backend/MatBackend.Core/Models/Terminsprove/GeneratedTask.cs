using System.Text.Json;
using System.Text.Json.Serialization;

namespace MatBackend.Core.Models.Terminsprove;

/// <summary>
/// A main task (Opgave) in a terminsprøve.
/// Each task has a context/scenario and 1-4 sub-questions (a, b, c, d)
/// that progressively increase in difficulty.
/// </summary>
public class GeneratedTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    /// <summary>
    /// Task type ID (e.g., "tal_ligninger", "geo_sammensat_figur")
    /// </summary>
    public string TaskTypeId { get; set; } = string.Empty;
    
    /// <summary>
    /// Category (tal_og_algebra, geometri_og_maaling, statistik_og_sandsynlighed)
    /// </summary>
    public string Category { get; set; } = string.Empty;
    
    /// <summary>
    /// The main context/scenario text that introduces the task (in Danish).
    /// E.g. "I en butik koster en trøje 250 kr. Der er 20% rabat."
    /// </summary>
    public string ContextText { get; set; } = string.Empty;
    
    /// <summary>
    /// Sub-questions (a, b, c, d) that progressively get harder.
    /// Minimum 1, maximum 4.
    /// </summary>
    public List<SubQuestion> SubQuestions { get; set; } = new();
    
    // --- Legacy single-question fields (kept for backwards compatibility) ---
    
    /// <summary>
    /// The question text in Danish (legacy - use SubQuestions instead)
    /// </summary>
    public string QuestionText { get; set; } = string.Empty;
    
    /// <summary>
    /// LaTeX formatted version of the question
    /// </summary>
    public string QuestionLatex { get; set; } = string.Empty;
    
    /// <summary>
    /// The correct answer(s) (legacy - use SubQuestions instead)
    /// </summary>
    public List<TaskAnswer> Answers { get; set; } = new();
    
    /// <summary>
    /// Overall difficulty level: "let", "middel", "svær"
    /// </summary>
    public string Difficulty { get; set; } = "middel";
    
    /// <summary>
    /// Variable values used in this task instance
    /// </summary>
    public Dictionary<string, object> Variables { get; set; } = new();
    
    /// <summary>
    /// Solution steps for validation and display (legacy - use SubQuestions instead)
    /// </summary>
    public List<SolutionStep> SolutionSteps { get; set; } = new();
    
    /// <summary>
    /// Visualization data if applicable
    /// </summary>
    public TaskVisualization? Visualization { get; set; }
    
    /// <summary>
    /// URL to a generated illustration image for this task (e.g. from Gemini image generation)
    /// </summary>
    public string? ImageUrl { get; set; }
    
    /// <summary>
    /// Validation status from the validator agent
    /// </summary>
    public ValidationResult Validation { get; set; } = new();
    
    /// <summary>
    /// Estimated time in seconds to solve all sub-questions
    /// </summary>
    [JsonConverter(typeof(LenientIntConverter))]
    public int EstimatedTimeSeconds { get; set; } = 60;
    
    /// <summary>
    /// Total points for all sub-questions
    /// </summary>
    [JsonConverter(typeof(LenientIntConverter))]
    public int Points { get; set; } = 1;
}

/// <summary>
/// A sub-question within a main task (e.g., "a)", "b)", "c)", "d)")
/// </summary>
public class SubQuestion
{
    /// <summary>
    /// Label: "a", "b", "c", "d"
    /// </summary>
    public string Label { get; set; } = string.Empty;
    
    /// <summary>
    /// The sub-question text
    /// </summary>
    public string QuestionText { get; set; } = string.Empty;
    
    /// <summary>
    /// The correct answer
    /// </summary>
    public TaskAnswer Answer { get; set; } = new();
    
    /// <summary>
    /// Solution steps for this sub-question
    /// </summary>
    public List<SolutionStep> SolutionSteps { get; set; } = new();
    
    /// <summary>
    /// Difficulty of this specific sub-question
    /// </summary>
    public string Difficulty { get; set; } = "let";
    
    /// <summary>
    /// Points for this sub-question
    /// </summary>
    [JsonConverter(typeof(LenientIntConverter))]
    public int Points { get; set; } = 1;
}

public class TaskAnswer
{
    public string Value { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public bool IsExact { get; set; } = true;
    public double? Tolerance { get; set; }
}

public class SolutionStep
{
    [JsonConverter(typeof(LenientIntConverter))]
    public int StepNumber { get; set; }
    public string Description { get; set; } = string.Empty;
    public string MathExpression { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
}

/// <summary>
/// A lenient int converter that handles LLM quirks:
/// - Normal integers: 3
/// - Strings containing integers: "3"
/// - Floats/doubles that are whole numbers: 3.0
/// - Strings containing floats: "3.0"
/// - Null/missing values: defaults to 0
/// </summary>
public class LenientIntConverter : JsonConverter<int>
{
    public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Number:
                if (reader.TryGetInt32(out int intVal))
                    return intVal;
                if (reader.TryGetDouble(out double dblVal))
                    return (int)Math.Round(dblVal);
                return 0;
                
            case JsonTokenType.String:
                var str = reader.GetString()?.Trim();
                if (string.IsNullOrEmpty(str)) return 0;
                if (int.TryParse(str, out int parsed)) return parsed;
                if (double.TryParse(str, System.Globalization.NumberStyles.Any, 
                    System.Globalization.CultureInfo.InvariantCulture, out double dParsed))
                    return (int)Math.Round(dParsed);
                return 0;
                
            case JsonTokenType.Null:
                return 0;
                
            default:
                // Skip the token and return default
                return 0;
        }
    }

    public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
    {
        writer.WriteNumberValue(value);
    }
}

public class TaskVisualization
{
    /// <summary>
    /// Type of visualization: "svg", "tikz", "chart", "none"
    /// </summary>
    public string Type { get; set; } = "none";
    
    /// <summary>
    /// SVG content if type is "svg"
    /// </summary>
    public string? SvgContent { get; set; }
    
    /// <summary>
    /// TikZ code if type is "tikz"
    /// </summary>
    public string? TikzCode { get; set; }
    
    /// <summary>
    /// Chart data if type is "chart"
    /// </summary>
    public ChartData? ChartData { get; set; }
    
    /// <summary>
    /// Alt text for accessibility
    /// </summary>
    public string AltText { get; set; } = string.Empty;
}

public class ChartData
{
    public string ChartType { get; set; } = "bar"; // bar, line, pie, boxplot
    public List<string> Labels { get; set; } = new();
    public List<DataSeries> Series { get; set; } = new();
}

public class DataSeries
{
    public string Name { get; set; } = string.Empty;
    public List<double> Values { get; set; } = new();
    public string? Color { get; set; }
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public bool IsSolvable { get; set; }
    public bool HasCorrectAnswer { get; set; }
    public bool DifficultyAppropriate { get; set; }
    public List<string> Issues { get; set; } = new();
    public string? ValidatorNotes { get; set; }
}

