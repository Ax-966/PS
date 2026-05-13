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
            using (var scope = _serviceProvider.CreateScope())
            {
                var reservationRepo = scope.ServiceProvider.GetRequiredService<IReservationRepository>();
                var seatRepo = scope.ServiceProvider.GetRequiredService<ISeatRepository>();
                var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                // AGREGAMOS EL REPOSITORIO DE AUDITORIA
                var auditLogRepo = scope.ServiceProvider.GetRequiredService<IAuditLogRepository>();

                var expiredReservations = await reservationRepo.GetExpiredReservationsAsync();

                foreach (var res in expiredReservations)
                {
                    await unitOfWork.BeginTransactionAsync();
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

                        // --- NUEVO: AUDITORIA DE EXPIRACIÓN ---
                        await auditLogRepo.CreateAsync(new AuditLog
                        {
                            UserId = res.UserId, // Registramos de quién era la reserva
                            Action = "RESERVATION_EXPIRED",
                            EntityType = "Reservation",
                            EntityId = res.Id.ToString(),
                            Details = $"Reserva expirada automáticamente tras 5 minutos. Butaca {res.SeatId} liberada.",
                            CreatedAt = DateTime.UtcNow
                        });
                        // --------------------------------------

                        await unitOfWork.CommitAsync();
                        _logger.LogWarning($"Reserva {res.Id} expirada. Butaca {res.SeatId} liberada.");
                    }
                    catch (Exception ex)
                    {
                        await unitOfWork.RollbackAsync();
                        _logger.LogError($"Error al procesar expiración de reserva {res.Id}: {ex.Message}");
                    }
                }
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}