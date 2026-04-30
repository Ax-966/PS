using Application.UseCases.Reservations.Commands;
using Application.UseCases.Reservations.Handlers;
using Microsoft.AspNetCore.Mvc;

namespace EventApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class ReservationsController : ControllerBase
    {
        private readonly CreateReservationHandler _createReservationHandler;

        public ReservationsController(CreateReservationHandler createReservationHandler)
        {
            _createReservationHandler = createReservationHandler;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReservation command)
        {
            var reservation = await _createReservationHandler.HandleAsync(command);
            return Ok(reservation);
        }
    }
}
