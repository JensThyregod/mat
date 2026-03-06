using MatBackend.Core.Models;

namespace MatBackend.Core.Interfaces;

public interface IStudentRepository
{
    Task<Student?> GetStudentByIdAsync(string id);
    Task<Student?> GetStudentByNameAsync(string name);
    Task<Student?> GetStudentByEmailAsync(string email);
    Task<Student?> GetStudentByVerificationTokenAsync(string token);
    Task UpdateStudentAsync(Student student);
    Task<bool> DeleteStudentAsync(string id);
}

