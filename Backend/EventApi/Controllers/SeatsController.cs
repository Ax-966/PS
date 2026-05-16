using Application.UseCases.Seats.Handlers;
using Application.UseCases.Seats.Queries;
using Microsoft.AspNetCore.Mvc;

namespace EventApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class SeatsController : ControllerBase
    {
        private readonly GetSeatsByEventHandler _getSeatsByEventHandler;
        private readonly GetSeatByIdHandler _getSeatByIdHandler;

        public SeatsController(GetSeatsByEventHandler getSeatsByEventHandler, GetSeatByIdHandler getSeatById)
        {
            _getSeatsByEventHandler = getSeatsByEventHandler;
            _getSeatByIdHandler = getSeatById;
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var seat = await _getSeatByIdHandler.HandleAsync(new GetSeatById { Id = id });

            if (seat == null) return NotFound();

            return Ok(seat);
        }

        [HttpGet("event/{eventId:int}")] 
        public async Task<IActionResult> GetByEvent(int eventId)
        {
            var seats = await _getSeatsByEventHandler.HandleAsync(new GetSeatsByEvent { EventId = eventId });

            if (seats == null || !seats.Any()) 
            {
                return NotFound($"No se encontraron asientos para el evento con ID {eventId}");
            }

            return Ok(seats);
        }
    }
}
