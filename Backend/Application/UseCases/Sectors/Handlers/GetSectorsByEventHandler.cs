using System;
using Application.Interfaces;
using Application.Interfaces.CQRS;
using Application.Models;
using Application.UseCases.Sectors.Queries;

namespace Application.UseCases.Sectors.Handlers;

public class GetSectorsByEventHandler : IQueryHandler<GetSectorsByEvent, IEnumerable<SectorResponseDto>>
{
    private readonly ISectorRepository _sectorRepository;

    public GetSectorsByEventHandler(ISectorRepository sectorRepository)
    {
        _sectorRepository = sectorRepository;
    }

    public async Task<IEnumerable<SectorResponseDto>> HandleAsync(GetSectorsByEvent query)
    {
        var sectors = await _sectorRepository.FindByConditionAsync(s => s.EventId == query.EventId);

        return sectors.Select(s => new SectorResponseDto
        {
            Id = s.Id,
            Name = s.Name,
            Price = s.Price,
            Capacity = s.Capacity
        });
    }
}

