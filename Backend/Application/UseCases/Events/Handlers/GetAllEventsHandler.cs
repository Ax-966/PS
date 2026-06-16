using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.Models;
using Application.UseCases.Events.Queries;

namespace Application.UseCases.Events.Handlers;

public class GetAllEventsHandler : IQueryHandler<GetAllEvents, IEnumerable<EventResponseDto>>
{
    private readonly IEventRepository _eventRepository;

    public GetAllEventsHandler(IEventRepository eventRepository)
    {
        _eventRepository = eventRepository;
    }

    public async Task<IEnumerable<EventResponseDto>> HandleAsync(GetAllEvents query)
    {
        var events = await _eventRepository.FindAllAsync();

        return events.Select(e => new EventResponseDto
        {
            Id = e.Id,
            Name = e.Name,
            EventDate = e.EventDate,
            Venue = e.Venue,
            Status = e.Status
        });
    }
}