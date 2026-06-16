using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Seat
    {
        public Guid Id { get; set; }
        public int SectorId { get; set; }
        public string? RowIdentifier { get; set; }
        public int SeatNumber { get; set; }
        public string? Status { get; set; }
        public int Version { get; set; }

        public virtual Sector? Sector { get; set; }
    }
}
