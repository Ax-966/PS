using System;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;
public class RoleRepository : RepositoryBase<Role>, IRoleRepository
{
    public RoleRepository(AppDbContext appDbContext) : base(appDbContext) { }

    public async Task<Role?> GetRoleByIdAsync(int id)
    {
        var roles = await FindByConditionAsync(e => e.RoleId == id);
 
        return roles.FirstOrDefault();
    }

    public async Task<IEnumerable<Role>> GetRoleByNameAsync(string name)
    {
        return await FindByConditionAsync(r => r.Name == name);
    }
}


