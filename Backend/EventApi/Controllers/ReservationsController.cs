using Application.UseCases.Reservations.Commands;
using Application.UseCases.Reservations.Handlers;
using Application.UseCases.Reservations.Queries;
using Microsoft.AspNetCore.Mvc;
using Application.Exceptions;

namespace EventApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class ReservationsController : ControllerBase
    {
        private readonly CreateReservationHandler _createReservationHandler;
        private readonly GetReservationByUserHandler _getReservationByUserHandler;

        public ReservationsController(
            CreateReservationHandler createReservationHandler,
            GetReservationByUserHandler getReservationByUserHandler)
        {
            _createReservationHandler = createReservationHandler;
            _getReservationByUserHandler = getReservationByUserHandler;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReservation command)
        {
            try
            {
                var reservation = await _createReservationHandler.HandleAsync(command);
                return Ok(reservation);
            }
            catch (SeatReservationConflictException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }


        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            var reservations = await _getReservationByUserHandler.HandleAsync(new GetReservationByUser { UserId = userId });
            return Ok(reservations);
        }
    }
}