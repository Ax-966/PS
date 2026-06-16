using Application.UseCases.Events.Commands;
using Application.UseCases.Events.Handlers;
using Application.UseCases.Events.Queries;
using Microsoft.AspNetCore.Mvc;

namespace EventApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly CreateEventHandler _createEventHandler;
        private readonly GetAllEventsHandler _getAllEventsHandler;
        private readonly GetEventByIdHandler _getEventByIdHandler;

        public EventsController(
            CreateEventHandler createEventHandler,
            GetAllEventsHandler getAllEventsHandler,
            GetEventByIdHandler getEventByIdHandler)
        {
            _createEventHandler = createEventHandler;
            _getAllEventsHandler = getAllEventsHandler;
            _getEventByIdHandler = getEventByIdHandler;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var events = await _getAllEventsHandler.HandleAsync(new GetAllEvents());
            return Ok(events);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var eventItem = await _getEventByIdHandler.HandleAsync(new GetEventById { Id = id });
            if (eventItem == null) return NotFound();
            return Ok(eventItem);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateEvent command)
        {
            var result = await _createEventHandler.HandleAsync(command);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
    }
}
