using System.Text.Json;
using System.Text.Json.Serialization;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models.Scoring;
using Microsoft.Extensions.Logging;

namespace MatBackend.Infrastructure.Repositories;

public class FileSkillStateRepository : ISkillStateRepository
{
    private readonly string _dataRoot;
    private readonly ILogger<FileSkillStateRepository> _logger;

    private static readonly JsonSerializerOptions ReadOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new BetaDistributionJsonConverter() }
    };

    private static readonly JsonSerializerOptions WriteOptions = new()
    {
        WriteIndented = true,
        Converters = { new BetaDistributionJsonConverter() }
    };

    public FileSkillStateRepository(string dataRoot, ILogger<FileSkillStateRepository> logger)
    {
        _dataRoot = dataRoot;
        _logger = logger;
    }

    public async Task<Dictionary<string, SkillState>> GetSkillStatesAsync(string studentId)
    {
        var path = SkillStatePath(studentId);
        if (!File.Exists(path))
        {
            _logger.LogDebug("No skill state file for student {StudentId}, returning empty", studentId);
            return new Dictionary<string, SkillState>();
        }

        var json = await File.ReadAllTextAsync(path);
        var result = JsonSerializer.Deserialize<Dictionary<string, SkillState>>(json, ReadOptions)
                     ?? new Dictionary<string, SkillState>();
        _logger.LogDebug("Loaded {Count} skill states for student {StudentId}", result.Count, studentId);
        return result;
    }

    public async Task SaveSkillStatesAsync(string studentId, Dictionary<string, SkillState> states)
    {
        var path = SkillStatePath(studentId);
        var dir = Path.GetDirectoryName(path);
        if (dir != null && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var json = JsonSerializer.Serialize(states, WriteOptions);
        await File.WriteAllTextAsync(path, json);
        _logger.LogDebug("Saved {Count} skill states for student {StudentId}", states.Count, studentId);
    }

    private string SkillStatePath(string studentId) =>
        Path.Combine(_dataRoot, "users", studentId, "skill-states.json");
}

/// <summary>
/// BetaDistribution is a readonly record struct, which needs a custom converter
/// because System.Text.Json doesn't handle readonly record structs with constructor params well.
/// </summary>
internal class BetaDistributionJsonConverter : JsonConverter<BetaDistribution>
{
    public override BetaDistribution Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        double alpha = 1, beta = 1;
        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndObject) break;
            if (reader.TokenType == JsonTokenType.PropertyName)
            {
                var prop = reader.GetString();
                reader.Read();
                if (string.Equals(prop, "Alpha", StringComparison.OrdinalIgnoreCase))
                    alpha = reader.GetDouble();
                else if (string.Equals(prop, "Beta", StringComparison.OrdinalIgnoreCase))
                    beta = reader.GetDouble();
            }
        }
        return new BetaDistribution(alpha, beta);
    }

    public override void Write(Utf8JsonWriter writer, BetaDistribution value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        writer.WriteNumber("Alpha", value.Alpha);
        writer.WriteNumber("Beta", value.Beta);
        writer.WriteEndObject();
    }
}
