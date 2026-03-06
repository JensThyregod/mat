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
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IStudentRepository studentRepository,
        ILogger<AuthController> logger)
    {
        _studentRepository = studentRepository;
        _logger = logger;
    }

    /// <summary>
    /// Returns the current user's profile. Auto-provisions a student record
    /// in storage on first call (using the Keycloak user ID and token claims).
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var keycloakId = User.GetKeycloakUserId();
        var givenName = User.FindFirst("given_name")?.Value ?? "";
        var familyName = User.FindFirst("family_name")?.Value ?? "";
        var name = $"{givenName} {familyName}".Trim();
        if (string.IsNullOrEmpty(name))
            name = User.FindFirst("name")?.Value ?? "Student";
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
                EmailVerified = emailVerified
            };
            await _studentRepository.UpdateStudentAsync(student);
            _logger.LogInformation("Auto-provisioned student record for Keycloak user {Id} ({Name})", keycloakId, name);
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
            EmailVerified = emailVerified
        });
    }
}

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
}
