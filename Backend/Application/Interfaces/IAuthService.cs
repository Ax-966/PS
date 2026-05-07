using System;

namespace Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(string email, string password, string name);

    Task<AuthResponse> LoginAsync(string email, string password);
}
public record AuthResponse(bool Success, string? Token, string? Email, string? Name, IEnumerable<string> Errors);