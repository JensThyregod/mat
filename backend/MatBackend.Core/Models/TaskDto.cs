namespace MatBackend.Core.Models;

public class TaskDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Latex { get; set; } = string.Empty;
    public List<string>? Parts { get; set; }
    public List<string> Tags { get; set; } = new();
    public string Difficulty { get; set; } = "medium";
    public string? Type { get; set; }
}
