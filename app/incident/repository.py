from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.incident.model import Incident
from app.incident.schemas import IncidentCreate, IncidentUpdate


class IncidentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, incident_id: int) -> Incident | None:
        return await self.db.get(Incident, incident_id)

    async def get_all(self, offset: int = 0, limit: int = 20) -> list[Incident]:
        results = await self.db.execute(
            select(Incident).order_by(Incident.id.desc()).offset(offset).limit(limit)
        )
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