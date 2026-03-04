using System.Text.Json;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;

namespace MatBackend.Infrastructure.Repositories;

public class FileStudentRepository : IStudentRepository
{
    private readonly string _dataRoot;
    private static readonly JsonSerializerOptions ReadOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly JsonSerializerOptions WriteOptions = new() { WriteIndented = true };

    public FileStudentRepository(string dataRoot)
    {
        _dataRoot = dataRoot;
    }

    public async Task<Student?> GetStudentByIdAsync(string id)
    {
        var path = Path.Combine(_dataRoot, "users", id, "profile.json");
        if (!File.Exists(path)) return null;

        var json = await File.ReadAllTextAsync(path);
        return JsonSerializer.Deserialize<Student>(json, ReadOptions);
    }

    public async Task<Student?> GetStudentByNameAsync(string name)
    {
        return await FindStudentAsync(s =>
            s.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<Student?> GetStudentByEmailAsync(string email)
    {
        return await FindStudentAsync(s =>
            s.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<Student?> GetStudentByVerificationTokenAsync(string token)
    {
        return await FindStudentAsync(s =>
            s.VerificationToken != null &&
            s.VerificationToken.Equals(token, StringComparison.Ordinal));
    }

    public async Task UpdateStudentAsync(Student student)
    {
        var path = Path.Combine(_dataRoot, "users", student.Id, "profile.json");
        var dir = Path.GetDirectoryName(path);
        if (dir != null && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var json = JsonSerializer.Serialize(student, WriteOptions);
        await File.WriteAllTextAsync(path, json);
    }

    private async Task<Student?> FindStudentAsync(Func<Student, bool> predicate)
    {
        var usersDir = Path.Combine(_dataRoot, "users");
        if (!Directory.Exists(usersDir)) return null;

        foreach (var dir in Directory.GetDirectories(usersDir))
        {
            var profilePath = Path.Combine(dir, "profile.json");
            if (!File.Exists(profilePath)) continue;

            var json = await File.ReadAllTextAsync(profilePath);
            var student = JsonSerializer.Deserialize<Student>(json, ReadOptions);
            if (student != null && predicate(student))
                return student;
        }

        return null;
    }
}

