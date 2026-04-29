using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.UseCases.Reservations.Commands
{
    public class CreateReservation
    {
        public int UserId { get; set; }
        public Guid SeatId { get; set; }

    }
}
