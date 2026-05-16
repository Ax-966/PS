using System;
using Domain.Entities;

namespace Application.Interfaces;

public interface IAuditLogRepository : IRepositoryBase<AuditLog>
{
    Task<IEnumerable<AuditLog>> GetByUserAsync(int userId);
    Task<IEnumerable<AuditLog>> GetByDateRangeAsync(DateTime from, DateTime to);
    Task<IEnumerable<AuditLog>> GetByActionAsync(string action);
    Task<IEnumerable<AuditLog>> GetAllAsync();
}