using MatBackend.Core.Models.Scoring;

namespace MatBackend.Core.Interfaces;

public interface ISkillStateRepository
{
    Task<Dictionary<string, SkillState>> GetSkillStatesAsync(string studentId);
    Task SaveSkillStatesAsync(string studentId, Dictionary<string, SkillState> states);
}
