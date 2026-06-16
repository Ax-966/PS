using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.Models;
using Application.UseCases.Events.Commands;

namespace Application.UseCases.Events.Handlers;

public class CreateEventHandler : ICommandHandler<CreateEvent, EventResponseDto>
{
    private readonly IEventRepository _eventRepository;

    public CreateEventHandler(IEventRepository eventRepository)
    {
        _eventRepository = eventRepository;
    }

    public async Task<EventResponseDto> HandleAsync(CreateEvent command)
    {
        var newEvent = new Domain.Entities.Event
        {
            Name = command.Name,
            EventDate = command.EventDate,
            Venue = command.Venue,
            Status = command.Status
        };

        await _eventRepository.CreateAsync(newEvent);

        return new EventResponseDto
        {
            Id = newEvent.Id,
            Name = newEvent.Name,
            EventDate = newEvent.EventDate,
            Venue = newEvent.Venue,
            Status = newEvent.Status
        };
    }
}