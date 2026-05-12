using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Application.Interfaces;
using Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Infrastructure.Identity;

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _config;

    public AuthService(UserManager<User> userManager, IConfiguration config)
    {
        _userManager = userManager;
        _config = config;
    }
    public async Task<AuthResponse> RegisterAsync(string email, string password, string name)
    {
        var user = new User { UserName = email,Email = email, Name = name };
    
        var result = await _userManager.CreateAsync(user, password);
    
        // ─── Error al crear usuario ─────────────────────────────
        if (!result.Succeeded)
        {
            return new AuthResponse(false, null, user.Email, user.Name, null, result.Errors.Select(e => e.Description));
        }
    
        // ─── Rol por defecto ────────────────────────────────────
        await _userManager.AddToRoleAsync(user, "Client");
    
        // ─── Obtener roles del usuario ──────────────────────────
        var roles = await _userManager.GetRolesAsync(user);
    
        var role = roles.Contains("Admin") ? "admin" : "client";
    
        // ─── Login automático luego del registro ───────────────
        return new AuthResponse(true,GenerateToken(user, roles),user.Email,user.Name,role,Array.Empty<string>());
    }
    public async Task<AuthResponse> LoginAsync(string email, string password)
    {
        var user = await _userManager.FindByEmailAsync(email);

        // ─── Credenciales inválidas ─────────────────────────────
        if (user is null || !await _userManager.CheckPasswordAsync(user, password))
        {
            return new AuthResponse( false, null, null, null, null, new[] { "Las credenciales no son válidas." });
        }

        // ─── Obtener roles ──────────────────────────────────────
        var roles = await _userManager.GetRolesAsync(user);

        var role = roles.Contains("Admin") ? "admin" : "client";

        // ─── Login exitoso ──────────────────────────────────────
        return new AuthResponse( true, GenerateToken(user, roles), user.Email, user.Name, role, Array.Empty<string>());
    }


















    private string GenerateToken(User user, IList<string> roles)
    {
        var jwt = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var issuer   = jwt["Issuer"];    
        var audience = jwt["Audience"];

        var claims = new List<Claim>{ new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()), 
                                     new(JwtRegisteredClaimNames.Email, user.Email!),
                                     new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
                                     new(ClaimTypes.Name,               user.Name),
                                     new(ClaimTypes.Role,               roles.Contains("Admin") ? "admin" : "client"), // ← este

        };
        var token = new JwtSecurityToken(issuer, audience, claims, expires: DateTime.UtcNow.AddHours(2), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
