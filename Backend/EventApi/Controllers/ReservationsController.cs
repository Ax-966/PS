using Application.UseCases.Reservations.Commands;
using Application.UseCases.Reservations.Handlers;
using Microsoft.AspNetCore.Mvc;
using Application.Exceptions;

namespace EventApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ReservationsController : ControllerBase
{
    private readonly CreateReservationHandler    _createHandler;
    private readonly GetReservationByUserHandler _getByUserHandler;

    public ReservationsController(CreateReservationHandler  createHandler,GetReservationByUserHandler getByUserHandler)
    {
        _createHandler    = createHandler;
        _getByUserHandler = getByUserHandler;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservation command)
    {
        try
        {
            var result = await _createHandler.HandleAsync(command);
            return CreatedAtAction(nameof(GetByUser),
                new { userId = result.UserId }, result);
        }
        catch (ConcurrencyException ex)     
        {
            return Conflict(new { message = ex.Message });
        }
        catch (InvalidOperationException ex) 
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)                 
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUser(int userId)
    {
        var result = await _getByUserHandler.HandleAsync(
            new Application.UseCases.Reservations.Queries.GetReservationByUser
            { UserId = userId });
        return Ok(result);
    }
}