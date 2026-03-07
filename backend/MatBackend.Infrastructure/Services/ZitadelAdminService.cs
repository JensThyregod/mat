using System.Net.Http.Headers;
using System.Text.Json;
using MatBackend.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace MatBackend.Infrastructure.Services;

public class ZitadelAdminService : IIdentityAdminService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly string _serviceToken;
    private readonly ILogger<ZitadelAdminService> _logger;

    public ZitadelAdminService(
        HttpClient httpClient,
        string baseUrl,
        string serviceToken,
        ILogger<ZitadelAdminService> logger)
    {
        _httpClient = httpClient;
        _baseUrl = baseUrl.TrimEnd('/');
        _serviceToken = serviceToken;
        _logger = logger;
    }

    public async Task<bool> DeleteUserAsync(string userId)
    {
        if (string.IsNullOrEmpty(_serviceToken))
        {
            _logger.LogWarning("No Zitadel service token configured — skipping user deletion");
            return false;
        }

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Delete,
                $"{_baseUrl}/management/v1/users/{userId}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _serviceToken);

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Deleted Zitadel user {UserId}", userId);
                return true;
            }

            var body = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Zitadel user deletion returned {StatusCode} for user {UserId}: {Body}",
                response.StatusCode, userId, body);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete Zitadel user {UserId}", userId);
            return false;
        }
    }
}
