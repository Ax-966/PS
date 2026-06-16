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

        public SeatsController(GetSeatsByEventHandler getSeatsByEventHandler)
        {
            _getSeatsByEventHandler = getSeatsByEventHandler;
        }

        [HttpGet("event/{eventId}")]
        public async Task<IActionResult> GetByEvent(int eventId)
        {
            var seats = await _getSeatsByEventHandler.HandleAsync(new GetSeatsByEvent { EventId = eventId });
            return Ok(seats);
        }
    }
}
