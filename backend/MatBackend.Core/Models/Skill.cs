namespace MatBackend.Core.Models;

public class Skill
{
    public string Category { get; set; } = string.Empty; // e.g., tal_og_algebra
    public string SubCategory { get; set; } = string.Empty; // e.g., broeker
    public double Score { get; set; } // 0.0 to 1.0 or similar
    public int TasksCompleted { get; set; }
    public DateTime LastUpdated { get; set; }
}

