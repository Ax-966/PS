using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.UseCases.Reservations.Commands;
using Domain.Entities;
using Application.Exceptions;

namespace Application.UseCases.Reservations.Handlers;

public class CreateReservationHandler : ICommandHandler<CreateReservation, Reservation>
{
    private readonly IReservationRepository _reservationRepository;
    private readonly ISeatRepository _seatRepository;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateReservationHandler(
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

   public async Task<Reservation> HandleAsync(CreateReservation command)
{
    await _unitOfWork.BeginTransactionAsync();

    try
    {
        var seat = await _seatRepository.GetSeatByIdAsync(command.SeatId);

        if (seat == null)
            throw new SeatReservationConflictException(
                "La butaca no existe."
            );

        if (seat.Status != "Available")
            throw new SeatReservationConflictException(
                "La butaca ya no está disponible."
            );

        seat.Status = "Reserved";
        seat.Version++;

        await _seatRepository.UpdateAsync(seat);

        var reservation = new Reservation
        {
            UserId = command.UserId,
            SeatId = command.SeatId,
            Status = "Pending",
            ReservedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
        };

        await _reservationRepository.CreateAsync(reservation);

        await _auditLogRepository.CreateAsync(new AuditLog
        {
            UserId = command.UserId,
            Action = "RESERVE_SUCCESS",
            EntityType = "Seat",
            EntityId = seat.Id.ToString(),
            Details = $"Seat {seat.Id} reserved by user {command.UserId}",
            CreatedAt = DateTime.UtcNow,
        });

        await _unitOfWork.CommitAsync();

        return reservation;
    }
    catch (ConcurrencyException)
    {
        await _unitOfWork.RollbackAsync();

        await _auditLogRepository.CreateAsync(new AuditLog
        {
            UserId = command.UserId,
            Action = "RESERVE_FAIL",
            EntityType = "Seat",
            EntityId = command.SeatId.ToString(),
            Details = $"Concurrency conflict on seat {command.SeatId}",
            CreatedAt = DateTime.UtcNow,
        });

        throw;
    }
    catch (SeatReservationConflictException)
    {
        await _unitOfWork.RollbackAsync();
        throw;
    }
    catch
    {
        await _unitOfWork.RollbackAsync();
        throw;
    }
}
}