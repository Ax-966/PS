using Application.Exceptions;
using Application.UseCases.Reservations.Commands;
using Application.UseCases.Reservations.Handlers;
using Application.UseCases.Reservations.Queries;
using Microsoft.AspNetCore.Mvc;
using static System.Net.Mime.MediaTypeNames;

namespace EventApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ReservationsController : ControllerBase
{
    private readonly CreateReservationHandler _createHandler;
    private readonly GetReservationByUserHandler _getByUserHandler;
    private readonly ConfirmReservationHandler _confirmHandler;
    private readonly DeleteReservationHandler _deleteHandler;

    public ReservationsController(CreateReservationHandler createHandler, GetReservationByUserHandler getByUserHandler,
        ConfirmReservationHandler confirmHandler, DeleteReservationHandler deleteHandler)
    {
        _createHandler = createHandler;
        _getByUserHandler = getByUserHandler;
        _confirmHandler = confirmHandler;
        _deleteHandler = deleteHandler;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservation command)
    {
        try
        {
            var result = await _createHandler.HandleAsync(command);
            return CreatedAtAction(nameof(GetByUser), new { userId = result.UserId }, result);
        }
        catch (SeatReservationConflictException ex)
        {
            return Conflict(new { message = ex.Message });
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

    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> Confirm(Guid id, [FromBody] int userId)
    {
        try
        {
            var result = await _confirmHandler.HandleAsync(new ConfirmReservation
            {
                ReservationId = id,
                UserId = userId
            });
            return Ok(result);
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
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] int userId)
    {
        try
        {
            var result =
                await _deleteHandler.HandleAsync(
                    new DeleteReservation
                    {
                        ReservationId = id,
                        UserId = userId
                    });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }
}