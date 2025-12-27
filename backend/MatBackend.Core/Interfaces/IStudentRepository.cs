using MatBackend.Core.Models;

namespace MatBackend.Core.Interfaces;

public interface IStudentRepository
{
    Task<Student?> GetStudentByIdAsync(string id);
    Task UpdateStudentAsync(Student student);
}

