using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.Models;
using Application.UseCases.Seats.Queries;

namespace Application.UseCases.Seats.Handlers
{
 
    public class GetSeatByIdHandler : IQueryHandler<GetSeatById, SeatResponseDto?>
    {
        private readonly ISeatRepository _seatRepository;

        public GetSeatByIdHandler(ISeatRepository seatRepository)
        {
            _seatRepository = seatRepository;
        }

        public async Task<SeatResponseDto?> HandleAsync(GetSeatById query)
        {
            // Ahora sí, query.Id existe porque GetSeatById lo tiene
            var seat = await _seatRepository.GetSeatByIdAsync(query.Id);

            if (seat == null) return null;

            return new SeatResponseDto
            {
                Id = seat.Id,
                RowIdentifier = seat.RowIdentifier,
                SeatNumber = seat.SeatNumber,
                Status = seat.Status,
                SectorId = seat.SectorId
            };
        }
    }
}

