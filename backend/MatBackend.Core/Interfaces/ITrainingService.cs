using MatBackend.Core.Models.Scoring;

namespace MatBackend.Core.Interfaces;

public interface ITrainingService
{
    /// <summary>Get all skill states for a student, initializing any missing skills.</summary>
    Task<Dictionary<string, SkillState>> GetSkillStatesAsync(string studentId);

    /// <summary>Record the result of answering questions in a training task and update skill state.</summary>
    Task<TrainingResultDto> RecordTrainingResultAsync(string studentId, TrainingAnswerRequest request);

    /// <summary>Recommend the next skill to practice using Thompson Sampling.</summary>
    Task<SkillRecommendation> RecommendNextSkillAsync(string studentId, string? categoryFilter = null);

    /// <summary>Reset all skill states for a student.</summary>
    Task ResetSkillStatesAsync(string studentId);
}

public class TrainingAnswerRequest
{
    public string SkillId { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "middel";
    public List<QuestionResult> Results { get; set; } = new();
}

public class QuestionResult
{
    public bool IsCorrect { get; set; }
}

public class TrainingResultDto
{
    public string SkillId { get; set; } = string.Empty;
    public SkillStateDto UpdatedSkill { get; set; } = new();
    public string PreviousLevel { get; set; } = string.Empty;
    public string NewLevel { get; set; } = string.Empty;
    public bool LevelChanged { get; set; }
}

public class SkillStateDto
{
    public string SkillId { get; set; } = string.Empty;
    public double Alpha { get; set; }
    public double Beta { get; set; }
    public double Mean { get; set; }
    public int TotalAttempts { get; set; }
    public string MasteryLevel { get; set; } = string.Empty;
    public string? DanishGrade { get; set; }
    public double ProgressWithinLevel { get; set; }
    public DateTime? LastPracticed { get; set; }
}

public class SkillRecommendation
{
    public string SkillId { get; set; } = string.Empty;
    public string RecommendedDifficulty { get; set; } = "middel";
    public string Reason { get; set; } = string.Empty;
}
