using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class SectorRepository : RepositoryBase<Sector>, ISectorRepository
{
    public SectorRepository(AppDbContext appDbContext) : base(appDbContext) { }

    public async Task<Sector?> GetSectorByIdAsync(int id)
    {
        var sectors = await FindByConditionAsync(s => s.Id == id);
        return sectors.FirstOrDefault();
    }

    public async Task<Sector?> GetSectorWithSeatsAsync(int sectorId)
    {
        return await AppDbContext.Set<Sector>()
            .Include(s => s.Seats)
            .FirstOrDefaultAsync(s => s.Id == sectorId);
    }
}