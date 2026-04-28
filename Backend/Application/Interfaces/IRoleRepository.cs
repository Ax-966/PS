using Domain.Entities;

namespace Application.Interfaces;

public interface IRoleRepository : IRepositoryBase<Role>
{
    Task<Role?> GetRoleByIdAsync(int id);
    Task<IEnumerable<Role>> GetRoleByNameAsync(string name);
}