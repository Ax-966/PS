using System;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class ReservationRepository : RepositoryBase<Reservation>, IReservationRepository
{
    public ReservationRepository(AppDbContext appDbContext) : base(appDbContext) { }

    public async Task<Reservation?> GetReservationByIdAsync(Guid id)
    {
        var reservations = await FindByConditionAsync(r => r.Id == id);
        return reservations.FirstOrDefault();
    }
    public async Task<IEnumerable<Reservation>> GetReservationsByUserAsync(int userId)
    {
        return await FindByConditionAsync(r => r.UserId == userId);
        
    }
    public async Task<IEnumerable<Reservation>> GetReservationsByEventAsync(int eventId)
    {
        return await AppDbContext.Set<Reservation>()
            .Include(r => r.Seat)
                .ThenInclude(s => s.Sector)
            .Where(r => r.Seat!.Sector!.EventId == eventId)
            .AsNoTracking()
            .ToListAsync();
    }
    public async Task<IEnumerable<Reservation>> GetReservationsByStatusAsync(string status)
    {
        return await FindByConditionAsync(r => r.Status == status);
    }
}
