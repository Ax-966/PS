using System;

namespace Application.UseCases.Reservations.Commands;

public class DeleteReservation
{
    public Guid ReservationId { get; set; }
    public int UserId { get; set; }
}
