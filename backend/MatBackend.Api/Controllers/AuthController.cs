using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace MatBackend.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IStudentRepository _studentRepository;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IStudentRepository studentRepository,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _studentRepository = studentRepository;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("signup")]
    public async Task<ActionResult<SignupResponse>> Signup([FromBody] SignupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Code) ||
            string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Manglende felter",
                Detail = "Brugernavn, kode og email er påkrævet."
            });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var name = request.Name.Trim();

        var existingByEmail = await _studentRepository.GetStudentByEmailAsync(email);
        if (existingByEmail != null)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Email allerede i brug",
                Detail = "Der findes allerede en konto med denne email."
            });
        }

        var existingByName = await _studentRepository.GetStudentByNameAsync(name);
        if (existingByName != null)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Brugernavn optaget",
                Detail = "Der findes allerede en konto med dette brugernavn."
            });
        }

        var id = GenerateStudentId(name);
        var token = GenerateVerificationToken();

        var student = new Student
        {
            Id = id,
            Name = name,
            Code = request.Code.Trim(),
            Email = email,
            EmailVerified = false,
            VerificationToken = token,
            VerificationTokenExpiry = DateTime.UtcNow.AddHours(24)
        };

        await _studentRepository.UpdateStudentAsync(student);

        var frontendUrl = _configuration["Auth:FrontendUrl"] ?? "http://localhost:5173";
        var verificationUrl = $"{frontendUrl}/verify-email?token={token}";

        try
        {
            await _emailService.SendVerificationEmailAsync(email, name, verificationUrl);
            student.LastVerificationEmailSent = DateTime.UtcNow;
            await _studentRepository.UpdateStudentAsync(student);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", email);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Email-fejl",
                Detail = "Kontoen blev oprettet, men bekræftelses-emailen kunne ikke sendes. Prøv at logge ind for at sende en ny."
            });
        }

        _logger.LogInformation("New student signed up: {Id} ({Email})", id, email);

        return Ok(new SignupResponse
        {
            Message = "Konto oprettet! Tjek din email for at bekræfte din konto.",
            StudentId = id
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<StudentDto>> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Manglende felter",
                Detail = "Brugernavn og kode er påkrævet."
            });
        }

        var student = await _studentRepository.GetStudentByNameAsync(request.Name.Trim());

        if (student == null ||
            !student.Code.Equals(request.Code.Trim(), StringComparison.Ordinal))
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "Ugyldigt login",
                Detail = "Forkert brugernavn eller kode."
            });
        }

        if (!student.EmailVerified)
        {
            return StatusCode(403, new ProblemDetails
            {
                Title = "Email ikke bekræftet",
                Detail = "Du skal bekræfte din email før du kan logge ind. Tjek din indbakke."
            });
        }

        return Ok(new StudentDto
        {
            Id = student.Id,
            Name = student.Name,
            Code = student.Code,
            Email = student.Email,
            EmailVerified = student.EmailVerified
        });
    }

    [HttpGet("verify-email")]
    public async Task<ActionResult<StudentDto>> VerifyEmail([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Manglende token",
                Detail = "Bekræftelses-token mangler."
            });
        }

        var student = await _studentRepository.GetStudentByVerificationTokenAsync(token);

        if (student == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Ugyldigt link",
                Detail = "Bekræftelses-linket er ugyldigt eller allerede brugt."
            });
        }

        if (student.VerificationTokenExpiry.HasValue &&
            student.VerificationTokenExpiry.Value < DateTime.UtcNow)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Link udløbet",
                Detail = "Bekræftelses-linket er udløbet. Log ind for at få tilsendt et nyt."
            });
        }

        student.EmailVerified = true;
        student.VerificationToken = null;
        student.VerificationTokenExpiry = null;
        await _studentRepository.UpdateStudentAsync(student);

        _logger.LogInformation("Email verified for student {Id} ({Email})", student.Id, student.Email);

        return Ok(new StudentDto
        {
            Id = student.Id,
            Name = student.Name,
            Code = student.Code,
            Email = student.Email,
            EmailVerified = student.EmailVerified
        });
    }

    [HttpPost("resend-verification")]
    public async Task<ActionResult> ResendVerification([FromBody] ResendRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Manglende felter",
                Detail = "Brugernavn og kode er påkrævet."
            });
        }

        var student = await _studentRepository.GetStudentByNameAsync(request.Name.Trim());

        if (student == null ||
            !student.Code.Equals(request.Code.Trim(), StringComparison.Ordinal))
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "Ugyldigt login",
                Detail = "Forkert brugernavn eller kode."
            });
        }

        if (student.EmailVerified)
        {
            return Ok(new { message = "Email er allerede bekræftet." });
        }

        if (student.LastVerificationEmailSent.HasValue)
        {
            var elapsed = DateTime.UtcNow - student.LastVerificationEmailSent.Value;
            var cooldown = TimeSpan.FromSeconds(60);
            if (elapsed < cooldown)
            {
                var remaining = (int)Math.Ceiling((cooldown - elapsed).TotalSeconds);
                return StatusCode(429, new ProblemDetails
                {
                    Title = "For mange forsøg",
                    Detail = $"Vent {remaining} sekunder før du sender en ny bekræftelses-email.",
                    Extensions = { ["retryAfterSeconds"] = remaining }
                });
            }
        }

        var token = GenerateVerificationToken();
        student.VerificationToken = token;
        student.VerificationTokenExpiry = DateTime.UtcNow.AddHours(24);
        await _studentRepository.UpdateStudentAsync(student);

        var frontendUrl = _configuration["Auth:FrontendUrl"] ?? "http://localhost:5173";
        var verificationUrl = $"{frontendUrl}/verify-email?token={token}";

        await _emailService.SendVerificationEmailAsync(student.Email, student.Name, verificationUrl);

        student.LastVerificationEmailSent = DateTime.UtcNow;
        await _studentRepository.UpdateStudentAsync(student);

        return Ok(new { message = "Ny bekræftelses-email sendt." });
    }

    private static string GenerateStudentId(string name)
    {
        var slug = name.ToLowerInvariant()
            .Replace("æ", "ae").Replace("ø", "oe").Replace("å", "aa")
            .Replace(" ", "-");
        // Remove non-alphanumeric characters except hyphens
        slug = new string(slug.Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray());
        var suffix = Guid.NewGuid().ToString("N")[..6];
        return $"{slug}-{suffix}";
    }

    private static string GenerateVerificationToken()
    {
        return Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("/", "_").Replace("+", "-").TrimEnd('=');
    }
}

public class SignupRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class LoginRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class ResendRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class SignupResponse
{
    public string Message { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
}

public class StudentDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
}
