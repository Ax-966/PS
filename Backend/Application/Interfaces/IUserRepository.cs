using System;
using Domain.Entities;

namespace Application.Interfaces;

public interface IUserRepository : IRepositoryBase<User>
{
    Task<User?> GetUserByEmailAsync(string email);
    Task<User?> GetUserByIdAsync(int id);
}
