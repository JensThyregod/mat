using System.Text.Json;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;

namespace MatBackend.Infrastructure.Repositories;

public class FileStudentRepository : IStudentRepository
{
    private readonly string _dataRoot;

    public FileStudentRepository(string dataRoot)
    {
        _dataRoot = dataRoot;
    }

    public async Task<Student?> GetStudentByIdAsync(string id)
    {
        var path = Path.Combine(_dataRoot, "users", id, "profile.json");
        if (!File.Exists(path)) return null;

        var json = await File.ReadAllTextAsync(path);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        return JsonSerializer.Deserialize<Student>(json, options);
    }

    public async Task UpdateStudentAsync(Student student)
    {
        var path = Path.Combine(_dataRoot, "users", student.Id, "profile.json");
        var dir = Path.GetDirectoryName(path);
        if (dir != null && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var options = new JsonSerializerOptions { WriteIndented = true };
        var json = JsonSerializer.Serialize(student, options);
        await File.WriteAllTextAsync(path, json);
    }
}

