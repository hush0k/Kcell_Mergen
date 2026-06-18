from typing import TypeVar, Type, Callable
from pydantic import BaseModel
from fastapi import Query, Depends

def make_filter_deps(
        filter_schema: Type[BaseModel],
        sort_schema: Type[BaseModel],
        default_sort_by: str,
        default_order: str = "asc",
) -> Callable:
    """Фабрика зависимостей для фильтрации и сортировки."""

    def dependency(
            filters: filter_schema = Depends(),  # type: ignore[valid-type]
            sort_by: str = Query(default=default_sort_by),
            order: str = Query(default=default_order, pattern="^(asc|desc)$"),
    ) -> dict:
        sort_fields = {f for f in sort_schema.model_fields}
        if sort_by not in sort_fields:
            from fastapi import HTTPException
            raise HTTPException(400, f"Недопустимое поле сортировки: {sort_by}")
        return {"filters": filters, "sort_by": sort_by, "order": order}

    return dependency