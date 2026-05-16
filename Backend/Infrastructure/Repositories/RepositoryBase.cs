using System.Linq.Expressions;
using Application.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public abstract class RepositoryBase<T> : IRepositoryBase<T> where T : class
{
    protected AppDbContext AppDbContext { get; set; }

    public RepositoryBase(AppDbContext appDbContext)
    {
        AppDbContext = appDbContext;
    }

    public async Task<IEnumerable<T>> FindAllAsync() =>
        await AppDbContext.Set<T>()
            .AsNoTracking()
            .ToListAsync();

    public async Task<IEnumerable<T>> FindByConditionAsync(
        Expression<Func<T, bool>> expression) =>
        await AppDbContext.Set<T>()
            .Where(expression)
            .AsNoTracking()
            .ToListAsync();

    public async Task CreateAsync(T entity)
    {
        await AppDbContext.Set<T>().AddAsync(entity);
    }

    public Task UpdateAsync(T entity)
    {
        AppDbContext.Set<T>().Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity)
    {
        AppDbContext.Set<T>().Remove(entity);
        return Task.CompletedTask;
    }
    public async Task SaveAsync() => await AppDbContext.SaveChangesAsync();
}