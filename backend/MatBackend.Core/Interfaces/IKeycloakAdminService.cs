namespace MatBackend.Core.Interfaces;

public interface IKeycloakAdminService
{
    Task<bool> DeleteUserAsync(string userId);
}
