using System;
using Domain.Entities;

namespace Application.Interfaces;

public interface ISectorRepository : IRepositoryBase<Sector>
{
    Task<Sector?> GetSectorByIdAsync(int id);
    Task<Sector?> GetSectorWithSeatsAsync(int sectorId);
}