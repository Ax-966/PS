using System.Reflection.Emit;
using Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<User, IdentityRole<int>, int>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) 
        : base(options)
    {
    }
    public DbSet<Event> Events { get; set; }
    public DbSet<Reservation> Reservations { get; set; }
    public DbSet<Seat> Seats { get; set; }
    public DbSet<Sector> Sectors { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Event tiene muchos Sectors
        modelBuilder.Entity<Sector>()
            .HasOne(s => s.Event)
            .WithMany(e => e.Sectors)
            .HasForeignKey(s => s.EventId);

        // Precision para Price
        modelBuilder.Entity<Sector>()
            .Property(s => s.Price)
            .HasColumnType("decimal(18,2)");

        // Sector tiene muchos Seats
        modelBuilder.Entity<Seat>()
            .HasOne(s => s.Sector)
            .WithMany(s => s.Seats)
            .HasForeignKey(s => s.SectorId);
        
 
        // Reservation pertenece a un User y un Seat
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.User)
            .WithMany(u => u.Reservations)
            .HasForeignKey(r => r.UserId);

        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Seat)
            .WithMany()
            .HasForeignKey(r => r.SeatId);

        // AuditLog pertenece a un User
        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId);

        // Event - configuracion basica
        modelBuilder.Entity<Event>()
            .HasKey(e => e.Id);

   
    }
}