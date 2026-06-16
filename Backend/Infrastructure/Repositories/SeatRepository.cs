using System;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class SeatRepository : RepositoryBase<Seat>, ISeatRepository
{
    public SeatRepository(AppDbContext appDbContext) : base(appDbContext) { }

    public async Task<Seat?> GetSeatByIdAsync(Guid id)
    {
        var seats = await FindByConditionAsync(s => s.Id == id);
        return seats.FirstOrDefault();
    }
    public async Task<IEnumerable<Seat>> GetSeatsBySectorAsync(int sectorId)
    {
        return await FindByConditionAsync(s => s.SectorId  == sectorId);   
    }
    public async Task<IEnumerable<Seat>> GetAvailableSeatsAsync(int sectorId)
    {
         var seats = await FindByConditionAsync(s => s.SectorId == sectorId 
                                                && s.Status == "Available");
        return seats;
    }
    public async Task<IEnumerable<Seat>> GetSeatsByEventIdAsync(int eventId)
    {
        return await FindByConditionAsync(s => s.Sector != null
                                           && s.Sector.EventId == eventId);
    }
}

