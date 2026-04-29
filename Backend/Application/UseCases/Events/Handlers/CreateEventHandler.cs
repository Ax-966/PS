using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces;
using Application.Models;
using Application.UseCases.Events.Commands;

namespace Application.UseCases.Events.Handlers
{
    public class CreateEventHandler
    {
        private readonly IEventRepository _eventRepository;

        public CreateEventHandler(IEventRepository eventRepository)
        {
            _eventRepository = eventRepository;
        }

        public async Task<EventResponseDto> Handle(CreateEvent command)
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
}
