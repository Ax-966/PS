using Application.Interfaces;
using Domain.Entities;

namespace EventApi.Workers;

public class ReservationTimeoutWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ReservationTimeoutWorker> _logger;

    public ReservationTimeoutWorker(IServiceProvider serviceProvider, ILogger<ReservationTimeoutWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Worker de expiración de reservas iniciado.");

        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation($"Worker ejecutándose: {DateTime.UtcNow}");

            using var scope = _serviceProvider.CreateScope();

            var reservationRepo = scope.ServiceProvider.GetRequiredService<IReservationRepository>();
            var seatRepo        = scope.ServiceProvider.GetRequiredService<ISeatRepository>();
            var auditLogRepo    = scope.ServiceProvider.GetRequiredService<IAuditLogRepository>();

            try
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var expiredReservations = await reservationRepo.GetExpiredReservationsAsync();
               
                foreach (var res in expiredReservations)
                {
                    try
                    {
                        var seat = await seatRepo.GetSeatByIdAsync(res.SeatId);
                        if (seat != null)
                        {
                            seat.Status = "Available";
                            await seatRepo.UpdateAsync(seat);
                        }

                        res.Status = "Expired";
                        await reservationRepo.UpdateAsync(res);

                        await auditLogRepo.CreateAsync(new AuditLog
                        {
                            UserId     = res.UserId,
                            Action     = "RESERVATION_EXPIRED",
                            EntityType = "Reservation",
                            EntityId   = res.Id.ToString(),
                            Details    = $"Reserva expirada automáticamente. Butaca {res.SeatId} liberada.",
                            CreatedAt  = DateTime.UtcNow
                        });

                        // Guardar usando el mismo contexto que los repositorios
                        await reservationRepo.SaveAsync();

                        _logger.LogWarning($"Reserva {res.Id} expirada. Butaca {res.SeatId} liberada.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Error al procesar reserva {res.Id}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error general en el Worker: {ex.Message} — {ex.InnerException?.Message}");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}