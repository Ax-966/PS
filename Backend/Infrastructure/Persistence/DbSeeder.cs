using System;
using Domain.Entities;

namespace Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Events.Any())
            return;

        // Evento
        var evento = new Event
        {
            Name = "Aerosmith",
            EventDate = DateTime.UtcNow.AddMonths(1),
            Venue = "Buenos Aires - Estadio Único",
            Status = "Active"
        };

        context.Events.Add(evento);
        await context.SaveChangesAsync();

        // Sectores
        var plateaAlta = new Sector
        {
            Name = "Platea Alta",
            EventId = evento.Id,
            Price = 25000m,
            Capacity = 50
        };

        var plateaBaja = new Sector
        {
            Name = "Platea Baja",
            EventId = evento.Id,
            Price = 45000m,
            Capacity = 50
        };

        context.Sectors.AddRange(plateaAlta, plateaBaja);
        await context.SaveChangesAsync();

        // Seats
        var seats = new List<Seat>();

        for (int i = 1; i <= 50; i++)
        {
            seats.Add(new Seat
            {
                Id = Guid.NewGuid(),
                SectorId = plateaAlta.Id,
                SeatNumber = i,
                Status = "Available"
            });

            seats.Add(new Seat
            {
                Id = Guid.NewGuid(),
                SectorId = plateaBaja.Id,
                SeatNumber = i,
                Status = "Available"
            });
        }

        context.Seats.AddRange(seats);
        await context.SaveChangesAsync();
    }
}