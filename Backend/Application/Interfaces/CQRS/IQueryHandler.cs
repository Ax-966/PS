using System;

namespace Application.Interfaces.CQRS;

public interface IQueryHandler<TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query);
}