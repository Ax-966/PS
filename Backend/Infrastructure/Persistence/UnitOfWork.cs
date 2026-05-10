using Application.Exceptions;
using Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IDbContextTransaction? _transaction;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public async Task BeginTransactionAsync() =>
        _transaction = await _context.Database.BeginTransactionAsync();

    public async Task CommitAsync()
    {
        try
        {
            await _context.SaveChangesAsync();
            await _transaction!.CommitAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyException( "This seat was reserved by another user.");
        }
    }

    public async Task RollbackAsync() =>
        await _transaction!.RollbackAsync();

    public async Task<int> SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}