using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces;
using Application.UseCases.Reservations.Commands;
using Domain.Entities;

namespace Application.UseCases.Reservations.Handlers
{
    public class CreateReservationHandler
    {
        private readonly IReservationRepository _reservationRepository;
        private readonly ISeatRepository _seatRepository;

        public CreateReservationHandler(IReservationRepository reservationRepository, ISeatRepository seatRepository)
        {
            _reservationRepository = reservationRepository;
            _seatRepository = seatRepository;
        }

        public async Task<Reservation> Handle(CreateReservation command)
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

            return reservation;
        }
    }
}
