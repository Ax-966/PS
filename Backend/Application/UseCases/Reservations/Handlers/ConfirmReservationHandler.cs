using System;
using System.Threading.Tasks;
using Application.Exceptions;
using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.UseCases.Reservations.Commands;
using Domain.Entities;

namespace Application.UseCases.Reservations.Handlers
{
    public class ConfirmReservationHandler : ICommandHandler<ConfirmReservation, Reservation>
    {
        private readonly IReservationRepository _reservationRepository;
        private readonly ISeatRepository _seatRepository;
        private readonly IAuditLogRepository _auditLogRepository;
        private readonly IUnitOfWork _unitOfWork;

        public ConfirmReservationHandler(
            IReservationRepository reservationRepository,
            ISeatRepository seatRepository,
            IAuditLogRepository auditLogRepository,
            IUnitOfWork unitOfWork)
        {
            _reservationRepository = reservationRepository;
            _seatRepository = seatRepository;
            _auditLogRepository = auditLogRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Reservation> HandleAsync(ConfirmReservation command)
        {
            await _unitOfWork.BeginTransactionAsync();

            try
            {
                var reservation = await _reservationRepository
                    .GetReservationByIdAsync(command.ReservationId);

                if (reservation == null)
                    throw new Exception("Reserva no encontrada.");

                if (reservation.Status != "Pending")
                    throw new InvalidOperationException(
                        "La reserva no está en estado pendiente."
                    );

                if (reservation.ExpiresAt <= DateTime.UtcNow)
                    throw new InvalidOperationException(
                        "La reserva ha expirado."
                    );

                var seat = await _seatRepository
                    .GetSeatByIdAsync(reservation.SeatId);

                if (seat == null)
                    throw new Exception("Butaca no encontrada.");

                // Cambiar estados
                seat.Status = "Sold";
                seat.Version++;

                reservation.Status = "Paid";

                await _seatRepository.UpdateAsync(seat);

                await _reservationRepository.UpdateAsync(reservation);

                await _auditLogRepository.CreateAsync(new AuditLog
                {
                    UserId = command.UserId,
                    Action = "PURCHASE",
                    EntityType = "Reservation",
                    EntityId = reservation.Id.ToString(),
                    Details =
                        $"Reservation {reservation.Id} confirmed, seat {seat.Id} sold",
                    CreatedAt = DateTime.UtcNow,
                });

                await _unitOfWork.CommitAsync();

                return reservation;
            }
            catch (ConcurrencyException)
            {
                await _unitOfWork.RollbackAsync();

                throw new ConcurrencyException(
                    "La butaca fue modificada por otro usuario."
                );
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }
    }
}