using System.Security.Claims;

namespace MatBackend.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static string GetUserId(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? principal.FindFirstValue("sub");

        if (string.IsNullOrEmpty(sub))
            throw new UnauthorizedAccessException("Missing user identifier in token");

        return sub;
    }
}
