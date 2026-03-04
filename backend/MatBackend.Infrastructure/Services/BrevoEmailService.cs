using System.Text;
using System.Text.Json;
using MatBackend.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace MatBackend.Infrastructure.Services;

public class BrevoEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _senderEmail;
    private readonly string _senderName;
    private readonly ILogger<BrevoEmailService> _logger;

    public BrevoEmailService(
        HttpClient httpClient,
        string apiKey,
        string senderEmail,
        string senderName,
        ILogger<BrevoEmailService> logger)
    {
        _httpClient = httpClient;
        _apiKey = apiKey;
        _senderEmail = senderEmail;
        _senderName = senderName;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string toEmail, string studentName, string verificationUrl)
    {
        var htmlContent = BuildVerificationHtml(studentName, verificationUrl);

        var payload = new
        {
            sender = new { name = _senderName, email = _senderEmail },
            to = new[] { new { email = toEmail, name = studentName } },
            subject = "Bekræft din email — Matematik Tutor",
            htmlContent
        };

        var json = JsonSerializer.Serialize(payload);
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("api-key", _apiKey);

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Brevo API error {Status}: {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Failed to send verification email: {response.StatusCode}");
        }

        _logger.LogInformation("Verification email sent to {Email}", toEmail);
    }

    private static string BuildVerificationHtml(string studentName, string verificationUrl)
    {
        return $"""
        <!DOCTYPE html>
        <html lang="da">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0;padding:0;background-color:#f5f3f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f3f0;padding:40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#c2725a 0%,#a85d48 100%);padding:32px 40px;text-align:center;">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                        <tr>
                          <td style="width:14px;height:14px;border-radius:50%;background:#fff;opacity:0.9;"></td>
                          <td style="padding-left:12px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                            Matematik Tutor
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1a1a1a;letter-spacing:-0.03em;">
                        Bekræft din email
                      </h1>
                      <p style="margin:0 0 28px;font-size:15px;color:#6b6b6b;line-height:1.6;">
                        Hej <strong style="color:#1a1a1a;">{studentName}</strong>, tak fordi du oprettede en konto!
                        Klik på knappen nedenfor for at bekræfte din email-adresse.
                      </p>

                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
                        <tr>
                          <td style="border-radius:12px;background:linear-gradient(135deg,#c2725a 0%,#a85d48 100%);">
                            <a href="{verificationUrl}"
                               target="_blank"
                               style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                              Bekræft email
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 20px;font-size:13px;color:#999;line-height:1.5;">
                        Linket udløber om 24 timer. Hvis du ikke har oprettet en konto, kan du ignorere denne email.
                      </p>

                      <!-- Fallback link -->
                      <div style="padding:16px;background:#f9f8f6;border-radius:10px;border:1px solid #eee;">
                        <p style="margin:0 0 6px;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
                          Virker knappen ikke? Kopier dette link:
                        </p>
                        <p style="margin:0;font-size:12px;color:#c2725a;word-break:break-all;line-height:1.4;">
                          {verificationUrl}
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 40px 28px;border-top:1px solid #f0eeeb;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#bbb;line-height:1.5;">
                        Matematik Tutor · Hjælp til FP9 matematik
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;
    }
}
