using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.UseCases.Reservations.Commands;
using Domain.Entities;

namespace Application.UseCases.Reservations.Handlers
{
  public class CreateReservationHandler : ICommandHandler<CreateReservation, Reservation>
{
    private readonly IReservationRepository _reservationRepository;
    private readonly ISeatRepository _seatRepository;
    private readonly IAuditLogRepository _auditLogRepository;

    public CreateReservationHandler(
        IReservationRepository reservationRepository,
        ISeatRepository seatRepository,
        IAuditLogRepository auditLogRepository)
    {
        _reservationRepository = reservationRepository;
        _seatRepository = seatRepository;
        _auditLogRepository = auditLogRepository;
    }

    public async Task<Reservation> HandleAsync(CreateReservation command)
    {
        var seat = await _seatRepository.GetSeatByIdAsync(command.SeatId);
        if (seat == null) throw new Exception("Seat not found");
        if (seat.Status != "Available") throw new Exception("Seat is not available");

        seat.Status = "Reserved";
        await _seatRepository.UpdateAsync(seat);

        var reservation = new Reservation
        {
            UserId = command.UserId,
            SeatId = command.SeatId,
            Status = "Pending",
            ReservedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5)
        };
        await _reservationRepository.CreateAsync(reservation);

        var log = new AuditLog
        {
            UserId = command.UserId,
            Action = "RESERVE_SUCCESS",
            EntityType = "Reservation",
            EntityId = reservation.Id.ToString(),
            Details = $"Seat {command.SeatId} reserved by user {command.UserId}",
            CreatedAt = DateTime.UtcNow
        };
        await _auditLogRepository.CreateAsync(log);

        return reservation;
    }
}
}
