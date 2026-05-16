using System;
using Domain.Entities;

namespace Application.Interfaces;

public interface IReservationRepository : IRepositoryBase<Reservation>
{
    Task<Reservation?> GetReservationByIdAsync(Guid id);
    Task<IEnumerable<Reservation>> GetReservationsByUserAsync(int userId);
    Task<IEnumerable<Reservation>> GetReservationsByEventAsync(int eventId);
    Task<IEnumerable<Reservation>> GetReservationsByStatusAsync(string status);
    Task<IEnumerable<Reservation>>GetExpiredReservationsAsync();
    Task DeleteAsync(Reservation reservation);
}
