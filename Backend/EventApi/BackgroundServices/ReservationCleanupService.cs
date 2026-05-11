using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventApi.BackgroundServices
{
    public class ReservationCleanupService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<ReservationCleanupService> _logger;

        public ReservationCleanupService(
            IServiceProvider services,
            ILogger<ReservationCleanupService> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                await ReleaseExpiredReservations();
            }
        }

        private async Task ReleaseExpiredReservations()
        {
            using var scope = _services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var expired = await context.Reservations
                .Where(r => r.Status == "Pending" && r.ExpiresAt <= DateTime.UtcNow)
                .Include(r => r.Seat)
                .ToListAsync();

            foreach (var reservation in expired)
            {
                reservation.Status = "Expired";
                if (reservation.Seat != null)
                    reservation.Seat.Status = "Available";

                context.AuditLogs.Add(new Domain.Entities.AuditLog
                {
                    Action = "RELEASE",
                    EntityType = "Reservation",
                    EntityId = reservation.Id.ToString(),
                    Details = $"Reservation {reservation.Id} expired automatically",
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (expired.Any())
            {
                await context.SaveChangesAsync();
                _logger.LogInformation($"{expired.Count} reserva(s) liberadas automáticamente.");
            }
        }
    }
}
