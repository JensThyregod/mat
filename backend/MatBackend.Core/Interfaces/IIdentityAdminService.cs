namespace MatBackend.Core.Interfaces;

public interface IIdentityAdminService
{
    Task<bool> DeleteUserAsync(string userId);
}
