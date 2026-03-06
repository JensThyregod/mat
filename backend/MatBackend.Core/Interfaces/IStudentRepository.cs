using MatBackend.Core.Models;

namespace MatBackend.Core.Interfaces;

public interface IStudentRepository
{
    Task<Student?> GetStudentByIdAsync(string id);
    Task<Student?> GetStudentByNameAsync(string name);
    Task UpdateStudentAsync(Student student);
    Task<bool> DeleteStudentAsync(string id);
}

