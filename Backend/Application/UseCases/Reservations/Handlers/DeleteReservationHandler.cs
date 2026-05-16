using System;
using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.UseCases.Reservations.Commands;
using Domain.Entities;
using Application.Exceptions;


namespace Application.UseCases.Reservations.Handlers;

public class DeleteReservationHandler : ICommandHandler<DeleteReservation, bool>
{
     private readonly IReservationRepository _reservationRepository;
    private readonly ISeatRepository _seatRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteReservationHandler(
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

    public async Task<bool> HandleAsync(
        DeleteReservation command
    )
    {
        await _unitOfWork.BeginTransactionAsync();

        try
        {
            var reservation =
                await _reservationRepository.GetReservationByIdAsync(command.ReservationId);

            if (reservation == null)
            {
                throw new Exception(
                    "La reserva no existe."
                );
            }

            if (reservation.UserId != command.UserId)
            {
                throw new Exception(
                    "No puedes cancelar esta reserva."
                );
            }

            var seat =
                await _seatRepository
                    .GetSeatByIdAsync(
                        reservation.SeatId
                    );

            if (seat == null)
            {
                throw new Exception(
                    "La butaca no existe."
                );
            }

            // liberar butaca
            seat.Status = "Available";

            seat.Version++;

            await _seatRepository.UpdateAsync(
                seat
            );

            // eliminar reserva
            await _reservationRepository.DeleteAsync(reservation);

            // audit log
            await _auditLogRepository.CreateAsync(
                new AuditLog
                {
                    UserId = command.UserId,

                    Action =
                        "RESERVATION_CANCELLED",

                    EntityType = "Reservation",

                    EntityId =
                        reservation.Id.ToString(),

                    Details =
                        $"Reservation {reservation.Id} cancelled",

                    CreatedAt =
                        DateTime.UtcNow,
                }
            );

            await _unitOfWork.CommitAsync();

            return true;
        }
        catch
        {
            await _unitOfWork.RollbackAsync();
            throw;
        }
    }
}
