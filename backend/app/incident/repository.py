from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.incident.enums import IncidentStatus
from app.incident.model import Incident
from app.incident.schemas import IncidentCreate, IncidentUpdate


class IncidentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, incident_id: int) -> Incident | None:
        return await self.db.get(Incident, incident_id)

    async def get_all(
        self,
        offset: int = 0,
        limit: int = 20,
        status: IncidentStatus | None = None,
        case_type: str | None = None,
    ) -> list[Incident]:
        query = select(Incident)
        if status is not None:
            query = query.where(Incident.status == status)
        if case_type is not None:
            query = query.where(Incident.case_type == case_type)

        # Open incidents first by default, then newest first within each group.
        is_open_first = case((Incident.status == IncidentStatus.OPEN, 0), else_=1)
        query = query.order_by(is_open_first, Incident.id.desc())

        query = query.offset(offset).limit(limit)
        results = await self.db.execute(query)
        return list(results.scalars().all())

    async def create(self, incident_in: IncidentCreate, username: str) -> Incident:
        incident = Incident(**incident_in.model_dump(), username=username)
        self.db.add(incident)
        return await self._save_incident(incident)

    async def update(self, incident: Incident, incident_in: IncidentUpdate) -> Incident:
        update_data = incident_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(incident, key, value)
        return await self._save_incident(incident)

    async def delete(self, incident: Incident) -> None:
        await self.db.delete(incident)
        await self.db.commit()

    async def _save_incident(self, incident: Incident) -> Incident:
        await self.db.commit()
        await self.db.refresh(incident)
        return incident
