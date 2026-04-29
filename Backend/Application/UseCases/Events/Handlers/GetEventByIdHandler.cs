using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces;
using Application.Models;
using Application.UseCases.Events.Queries;

namespace Application.UseCases.Events.Handlers
{
    public class GetEventByIdHandler
    {
        private readonly IEventRepository _eventRepository;

        public GetEventByIdHandler(IEventRepository eventRepository)
        {
            _eventRepository = eventRepository;
        }

        public async Task<EventResponseDto?> Handle(GetEventById query)
        {
            var eventEntity = await _eventRepository.GetEventByIdAsync(query.Id);

            if (eventEntity == null) return null;

            return new EventResponseDto
            {
                Id = eventEntity.Id,
                Name = eventEntity.Name,
                EventDate = eventEntity.EventDate,
                Venue = eventEntity.Venue,
                Status = eventEntity.Status
            };
        }
    }
}
