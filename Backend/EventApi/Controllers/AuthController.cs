using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EventApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _authService.RegisterAsync(
            request.Email,
            request.Password,
            request.Name
        );

        if (!result.Success) return BadRequest(new { errors = result.Errors });

        return Ok(new
        {
            token = result.Token,
            email = result.Email,
            name  = result.Name
        });
    }
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _authService.LoginAsync(
            request.Email,
            request.Password
        );

        if (!result.Success) return Unauthorized(new { errors = result.Errors });

        return Ok(new
        {
            token = result.Token,
            email = result.Email,
            name  = result.Name
        });
    }
}
public record RegisterRequest(string Email, string Password, string Name);
public record LoginRequest(string Email, string Password);