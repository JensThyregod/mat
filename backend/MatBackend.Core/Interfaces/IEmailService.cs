namespace MatBackend.Core.Interfaces;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string studentName, string verificationUrl);
}
