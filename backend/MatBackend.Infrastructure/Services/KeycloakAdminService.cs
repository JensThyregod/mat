using System.Net.Http.Headers;
using System.Text.Json;
using MatBackend.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace MatBackend.Infrastructure.Services;

public class KeycloakAdminService : IKeycloakAdminService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly string _realm;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly ILogger<KeycloakAdminService> _logger;

    public KeycloakAdminService(
        HttpClient httpClient,
        string baseUrl,
        string realm,
        string clientId,
        string clientSecret,
        ILogger<KeycloakAdminService> logger)
    {
        _httpClient = httpClient;
        _baseUrl = baseUrl.TrimEnd('/');
        _realm = realm;
        _clientId = clientId;
        _clientSecret = clientSecret;
        _logger = logger;
    }

    public async Task<bool> DeleteUserAsync(string userId)
    {
        try
        {
            var token = await GetAdminTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("Could not obtain Keycloak admin token — skipping Keycloak user deletion");
                return false;
            }

            var request = new HttpRequestMessage(HttpMethod.Delete,
                $"{_baseUrl}/admin/realms/{_realm}/users/{userId}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Deleted Keycloak user {UserId}", userId);
                return true;
            }

            _logger.LogWarning("Keycloak user deletion returned {StatusCode} for user {UserId}",
                response.StatusCode, userId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete Keycloak user {UserId}", userId);
            return false;
        }
    }

    private async Task<string?> GetAdminTokenAsync()
    {
        try
        {
            var tokenUrl = $"{_baseUrl}/realms/master/protocol/openid-connect/token";

            var form = new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = _clientId,
                ["client_secret"] = _clientSecret,
            };

            var response = await _httpClient.PostAsync(tokenUrl, new FormUrlEncodedContent(form));
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get Keycloak admin token: {StatusCode}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("access_token").GetString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error obtaining Keycloak admin token");
            return null;
        }
    }
}
