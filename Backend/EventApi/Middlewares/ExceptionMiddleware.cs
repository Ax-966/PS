using Application.Exceptions;
using System.Net;
using System.Text.Json;

namespace EventApi.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            context.Response.ContentType = "application/json";

            // Aquí centralizamos los códigos de error
            var statusCode = ex switch
            {
                ConcurrencyException => HttpStatusCode.Conflict,           // 409
                SeatReservationConflictException => HttpStatusCode.Conflict, // 409
                KeyNotFoundException => HttpStatusCode.NotFound,             // 404
                _ => HttpStatusCode.InternalServerError                      // 500
            };

            context.Response.StatusCode = (int)statusCode;
            var result = JsonSerializer.Serialize(new { message = ex.Message });
            await context.Response.WriteAsync(result);
        }
    }
}
