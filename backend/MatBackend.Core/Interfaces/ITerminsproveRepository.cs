using MatBackend.Core.Models.Terminsprove;

namespace MatBackend.Core.Interfaces;

public interface ITerminsproveRepository
{
    /// <summary>
    /// Save a generated terminsprøve
    /// </summary>
    Task SaveAsync(TerminsproveResult terminsprove);
    
    /// <summary>
    /// Get a terminsprøve by ID
    /// </summary>
    Task<TerminsproveResult?> GetByIdAsync(string id);
    
    /// <summary>
    /// Get all terminsprøver, optionally filtered by student
    /// </summary>
    Task<IEnumerable<TerminsproveResult>> GetAllAsync(string? studentId = null);
    
    /// <summary>
    /// Delete a terminsprøve by ID
    /// </summary>
    Task<bool> DeleteAsync(string id);
}

