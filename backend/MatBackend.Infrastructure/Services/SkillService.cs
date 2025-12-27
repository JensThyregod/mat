using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;

namespace MatBackend.Infrastructure.Services;

public class SkillService : ISkillService
{
    private readonly IStudentRepository _studentRepository;
    private readonly ITaskRepository _taskRepository;

    public SkillService(IStudentRepository studentRepository, ITaskRepository taskRepository)
    {
        _studentRepository = studentRepository;
        _taskRepository = taskRepository;
    }

    public async Task UpdateStudentSkillsAsync(string studentId, List<TaskAnswer> answers, List<EvaluationResult> results)
    {
        var student = await _studentRepository.GetStudentByIdAsync(studentId);
        if (student == null) return;

        for (int i = 0; i < answers.Count; i++)
        {
            var answer = answers[i];
            var result = results[i];

            var metadata = await _taskRepository.GetTaskMetadataAsync(answer.TaskId);
            if (metadata == null) continue;

            var (category, subCategory, difficulty) = metadata.Value;

            var skill = student.Skills.FirstOrDefault(s => 
                s.Category == category && s.SubCategory == subCategory);

            if (skill == null)
            {
                skill = new Skill
                {
                    Category = category,
                    SubCategory = subCategory,
                    Score = 0.5, 
                    TasksCompleted = 0
                };
                student.Skills.Add(skill);
            }

            skill.TasksCompleted++;
            skill.LastUpdated = DateTime.UtcNow;

            if (result.IsCorrect)
            {
                skill.Score = Math.Min(1.0, skill.Score + 0.05);
            }
            else
            {
                skill.Score = Math.Max(0.0, skill.Score - 0.05);
            }
        }

        await _studentRepository.UpdateStudentAsync(student);
    }
}

