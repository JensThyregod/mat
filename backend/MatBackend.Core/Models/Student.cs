namespace MatBackend.Core.Models;

public class Student
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Class { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<Skill> Skills { get; set; } = new();
}

