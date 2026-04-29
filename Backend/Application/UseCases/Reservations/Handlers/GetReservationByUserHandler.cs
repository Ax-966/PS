using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces;
using Application.UseCases.Reservations.Queries;
using Domain.Entities;

namespace Application.UseCases.Reservations.Handlers
{
    public class GetReservationByUserHandler
    {
        private readonly IReservationRepository _reservationRepository;

        public GetReservationByUserHandler(IReservationRepository reservationRepository)
        {
            _reservationRepository = reservationRepository;
        }

        public async Task<IEnumerable<Reservation>> Handle(GetReservationByUser query)
        {
            return await _reservationRepository.GetReservationsByUserAsync(query.UserId);
        }
    }
}
