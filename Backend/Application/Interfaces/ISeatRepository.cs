using System;
using Domain.Entities;

namespace Application.Interfaces;

public interface ISeatRepository : IRepositoryBase<Seat>
{
    Task<Seat?> GetSeatByIdAsync(Guid id);
    Task<IEnumerable<Seat>> GetSeatsBySectorAsync(int sectorId);
    Task<IEnumerable<Seat>> GetAvailableSeatsAsync(int sectorId);
    Task<IEnumerable<Seat>> GetSeatsByEventIdAsync(int eventId);
}