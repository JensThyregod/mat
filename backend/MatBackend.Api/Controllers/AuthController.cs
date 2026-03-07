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
    private readonly IIdentityAdminService _identityAdmin;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IStudentRepository studentRepository,
        IIdentityAdminService identityAdmin,
        IWebHostEnvironment environment,
        ILogger<AuthController> logger)
    {
        _studentRepository = studentRepository;
        _identityAdmin = identityAdmin;
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// Returns the current user's profile. Auto-provisions a student record
    /// in storage on first call (using the user ID and token claims).
    /// Users created while the backend runs in Development mode are flagged as test users.
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userId = User.GetUserId();
        var givenName = User.FindFirst("given_name")?.Value ?? "";
        var familyName = User.FindFirst("family_name")?.Value ?? "";
        var name = $"{givenName} {familyName}".Trim();
        if (string.IsNullOrEmpty(name))
            name = User.FindFirst("name")?.Value ?? "Student";
        var email = User.FindFirst("email")?.Value ?? "";
        var emailVerified = User.FindFirst("email_verified")?.Value == "true";

        var student = await _studentRepository.GetStudentByIdAsync(userId);

        if (student == null)
        {
            student = new Student
            {
                Id = userId,
                Name = name,
                Email = email,
                Code = "",
                EmailVerified = emailVerified,
                IsTestUser = _environment.IsDevelopment()
            };
            await _studentRepository.UpdateStudentAsync(student);
            _logger.LogInformation(
                "Auto-provisioned student record for user {Id} ({Name}), IsTestUser={IsTest}",
                userId, name, student.IsTestUser);
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
    /// the identity provider record and all stored data.
    /// </summary>
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteCurrentUser()
    {
        var userId = User.GetUserId();
        var student = await _studentRepository.GetStudentByIdAsync(userId);

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

        var idpDeleted = await _identityAdmin.DeleteUserAsync(userId);
        if (!idpDeleted)
        {
            _logger.LogWarning("Identity provider deletion failed for user {Id} — continuing with data deletion", userId);
        }

        var dataDeleted = await _studentRepository.DeleteStudentAsync(userId);
        _logger.LogInformation(
            "Deleted test user {Id}: idp={IdpDeleted}, data={DataDeleted}",
            userId, idpDeleted, dataDeleted);

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
