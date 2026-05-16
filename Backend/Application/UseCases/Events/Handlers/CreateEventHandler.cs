using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.Models;
using Application.UseCases.Events.Commands;

namespace Application.UseCases.Events.Handlers;

public class CreateEventHandler : ICommandHandler<CreateEvent, EventResponseDto>
{
    private readonly IEventRepository _eventRepository;
    private readonly ISectorRepository _sectorRepository;
    private readonly ISeatRepository _seatRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateEventHandler(
        IEventRepository eventRepository,
        ISectorRepository sectorRepository,
        ISeatRepository seatRepository,
        IUnitOfWork unitOfWork)
    {
        _eventRepository = eventRepository;
        _sectorRepository = sectorRepository;
        _seatRepository = seatRepository;
        _unitOfWork = unitOfWork;
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
        await _unitOfWork.SaveChangesAsync();

        Console.WriteLine($"Cantidad de sectores recibidos: {command.Sectors.Count}");


        foreach (var sectorItem in command.Sectors)
        {
            var newSector = new Domain.Entities.Sector
            {
                EventId = newEvent.Id,
                Name = sectorItem.Name,
                Price = sectorItem.Price,
                Capacity = sectorItem.Rows * sectorItem.Cols
            };

            await _sectorRepository.CreateAsync(newSector);
            await _unitOfWork.SaveChangesAsync(); 
            

            for (int row = 1; row <= sectorItem.Rows; row++)
            {
                for (int col = 1; col <= sectorItem.Cols; col++)
                {
                    var newSeat = new Domain.Entities.Seat
                    {
                        Id = Guid.NewGuid(),
                        SectorId = newSector.Id,
                        RowIdentifier = ((char)('A' + row - 1)).ToString(),
                        SeatNumber = col,
                        Status = "Available",
                        Version = 1
                    };

                    await _seatRepository.CreateAsync(newSeat);
                }
            }
            await _unitOfWork.SaveChangesAsync();
        }
        
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