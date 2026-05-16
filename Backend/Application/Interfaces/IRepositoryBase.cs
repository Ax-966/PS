using System;
using System.Linq.Expressions;

namespace Application.Interfaces;

public interface IRepositoryBase<T>
{
    Task<IEnumerable<T>> FindAllAsync();
    Task<IEnumerable<T>> FindByConditionAsync(Expression<Func<T, bool>> expression);
    Task CreateAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task SaveAsync();
}