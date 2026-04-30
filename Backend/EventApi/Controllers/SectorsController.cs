using Application.UseCases.Sectors.Handlers;
using Application.UseCases.Sectors.Queries;
using Microsoft.AspNetCore.Mvc;
using Application.Interfaces.CQRS;

namespace EventApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class SectorsController : ControllerBase
    {
        private readonly GetSectorsByEventHandler _getSectorsByEventHandler;

        public SectorsController(GetSectorsByEventHandler getSectorsByEventHandler)
        {
            _getSectorsByEventHandler = getSectorsByEventHandler;
        }

        [HttpGet("event/{eventId}")]
        public async Task<IActionResult> GetByEvent(int eventId)
        {
            var sectors = await _getSectorsByEventHandler.HandleAsync(new GetSectorsByEvent { EventId = eventId });
            return Ok(sectors);
        }
    }
}
