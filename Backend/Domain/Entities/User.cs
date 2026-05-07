using Microsoft.AspNetCore.Identity;

namespace Domain.Entities;

public class User : IdentityUser<int> 
{
    // Identity ya cuenta con: Id, Email, PasswordHash, UserName, etc.  
    public string Name { get; set; } = string.Empty;
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}