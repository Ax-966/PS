using Domain.Entities;

namespace Application.Interfaces;

public interface IEventRepository : IRepositoryBase<Event>
{
    Task<Event?> GetEventByIdAsync(int id);
    Task<IEnumerable<Event>> GetEventByStatusAsync(string status);
}