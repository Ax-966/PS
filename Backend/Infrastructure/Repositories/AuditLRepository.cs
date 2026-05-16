using System;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class AuditLRepository : RepositoryBase<AuditLog>, IAuditLogRepository
{
    public AuditLRepository(AppDbContext appDbContext) : base(appDbContext) { }

    public async Task<IEnumerable<AuditLog>> GetByUserAsync(int userId)
    {
        return await FindByConditionAsync(a => a.UserId == userId);
    }

    public async Task<IEnumerable<AuditLog>> GetByDateRangeAsync(DateTime from, DateTime to)
    {
        return await FindByConditionAsync(a => a.CreatedAt >= from && a.CreatedAt <= to);
    }

    public async Task<IEnumerable<AuditLog>> GetByActionAsync(string action)
    {
        return await FindByConditionAsync(a => a.Action == action);
    }
    public async Task<IEnumerable<AuditLog>> GetAllAsync()
    {
        return await FindAllAsync();
    }
}
