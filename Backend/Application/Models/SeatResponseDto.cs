using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Models
{
    public class SeatResponseDto
    {
        public Guid Id { get; set; }
        public string? RowIdentifier { get; set; }
        public int SeatNumber { get; set; }
        public string? Status { get; set; }

        public int SectorId { get; set; }
    }
}
