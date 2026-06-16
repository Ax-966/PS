using System;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class UserRepository : RepositoryBase<User>, IUserRepository
{
    public UserRepository(AppDbContext appDbContext) : base(appDbContext) { }

    public async Task<User?> GetUserByIdAsync(int id)
    {
        var Users = await FindByConditionAsync(e => e.Id == id);
 
        return Users.FirstOrDefault();
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        var users = await FindByConditionAsync(e => e.Email == email);
        return users.FirstOrDefault();
    }
  
}


