using Domain.Entities;
using Application.Interfaces;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class EventRepository : RepositoryBase<Event>, IEventRepository
{
    public EventRepository(AppDbContext appDbContext) : base(appDbContext) { }

    public async Task<Event?> GetEventByIdAsync(int id)
    {
        var events = await FindByConditionAsync(e => e.Id == id);
        return events.FirstOrDefault();
    }

    public async Task<IEnumerable<Event>> GetEventByStatusAsync(string status)
    {
        return await FindByConditionAsync(m => m.Status == status);
    }
}