using MatBackend.Api.Extensions;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatBackend.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IStudentRepository _studentRepository;
    private readonly IKeycloakAdminService _keycloakAdmin;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IStudentRepository studentRepository,
        IKeycloakAdminService keycloakAdmin,
        IWebHostEnvironment environment,
        ILogger<AuthController> logger)
    {
        _studentRepository = studentRepository;
        _keycloakAdmin = keycloakAdmin;
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// Returns the current user's profile. Auto-provisions a student record
    /// in storage on first call (using the Keycloak user ID and token claims).
    /// Users created while the backend runs in Development mode are flagged as test users.
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var keycloakId = User.GetKeycloakUserId();
        var name = User.FindFirst("preferred_username")?.Value
                   ?? User.FindFirst("name")?.Value
                   ?? "Student";
        var email = User.FindFirst("email")?.Value ?? "";
        var emailVerified = User.FindFirst("email_verified")?.Value == "true";

        var student = await _studentRepository.GetStudentByIdAsync(keycloakId);

        if (student == null)
        {
            student = new Student
            {
                Id = keycloakId,
                Name = name,
                Email = email,
                Code = "",
                EmailVerified = emailVerified,
                IsTestUser = _environment.IsDevelopment()
            };
            await _studentRepository.UpdateStudentAsync(student);
            _logger.LogInformation(
                "Auto-provisioned student record for Keycloak user {Id} ({Name}), IsTestUser={IsTest}",
                keycloakId, name, student.IsTestUser);
        }
        else if (student.Name != name || student.Email != email)
        {
            student.Name = name;
            student.Email = email;
            student.EmailVerified = emailVerified;
            await _studentRepository.UpdateStudentAsync(student);
        }

        return Ok(new UserProfileDto
        {
            Id = student.Id,
            Name = student.Name,
            Email = student.Email,
            EmailVerified = emailVerified,
            IsTestUser = student.IsTestUser
        });
    }

    /// <summary>
    /// Deletes the current user's account. Only allowed for test users
    /// (users created in the development environment). Removes both
    /// Keycloak identity and all stored data.
    /// </summary>
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteCurrentUser()
    {
        var keycloakId = User.GetKeycloakUserId();
        var student = await _studentRepository.GetStudentByIdAsync(keycloakId);

        if (student == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Bruger ikke fundet",
                Detail = "Ingen bruger fundet med dette ID"
            });
        }

        if (!student.IsTestUser)
        {
            return StatusCode(403, new ProblemDetails
            {
                Title = "Ikke tilladt",
                Detail = "Kun testbrugere kan slettes"
            });
        }

        var keycloakDeleted = await _keycloakAdmin.DeleteUserAsync(keycloakId);
        if (!keycloakDeleted)
        {
            _logger.LogWarning("Keycloak deletion failed for user {Id} — continuing with data deletion", keycloakId);
        }

        var dataDeleted = await _studentRepository.DeleteStudentAsync(keycloakId);
        _logger.LogInformation(
            "Deleted test user {Id}: keycloak={KeycloakDeleted}, data={DataDeleted}",
            keycloakId, keycloakDeleted, dataDeleted);

        return NoContent();
    }
}

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
    public bool IsTestUser { get; set; }
}
