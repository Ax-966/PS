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
    public class GetSeatsByEventHandler : IQueryHandler<GetSeatsByEvent, IEnumerable<SeatResponseDto>>
    {
        private readonly ISeatRepository _seatRepository;

         public GetSeatsByEventHandler(ISeatRepository seatRepository)
         {
             _seatRepository = seatRepository;
         }

        public async Task<IEnumerable<SeatResponseDto>> HandleAsync(GetSeatsByEvent query)
        {
            var seats = await _seatRepository.GetSeatsByEventIdAsync(query.EventId);

            return seats.Select(s => new SeatResponseDto
            {
                Id = s.Id,
                RowIdentifier = s.RowIdentifier,
                SeatNumber = s.SeatNumber,
                Status = s.Status,
                SectorId = s.SectorId
            });


        }
    }
}
