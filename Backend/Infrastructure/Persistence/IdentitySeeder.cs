using Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Infrastructure.Seeders;

public static class IdentitySeeder
{
    public static async Task SeedAdminsAsync(
        UserManager<User> userManager,
        RoleManager<IdentityRole<int>> roleManager)
    {
        // ─── Roles ───────────────────────────────────────────
        string[] roles = ["Admin", "Client"];

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole<int>(role));
            }
        }

        // ─── Lista de admins ─────────────────────────────────
        var admins = new[]
        {
            new
            {
                Name     = "Axel",
                Email    = "axel@ticketvivo.com",
                Password = "Axel123!"
            },
            new
            {
                Name     = "Gabriela",
                Email    = "gabriela@ticketvivo.com",
                Password = "Gaby123!"
            }
        };

        // ─── Crear admins si no existen ─────────────────────
        foreach (var adminData in admins)
        {
            var existingUser = await userManager.FindByEmailAsync(adminData.Email);

            if (existingUser is not null)
                continue;

            var admin = new User
            {
                UserName = adminData.Email,
                Email    = adminData.Email,
                Name     = adminData.Name,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(admin, adminData.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));

                throw new Exception(
                    $"Error creando admin {adminData.Email}: {errors}"
                );
            }

            await userManager.AddToRoleAsync(admin, "Admin");
        }
    }
}