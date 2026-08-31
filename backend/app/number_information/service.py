from app.number_information.resolver import GraphResolver
from app.number_information.schemas import (
    NumberInformationBulkRequest,
    NumberInformationBulkResponse,
    NumberInformationRequest,
    NumberInformationResponse,
)


class OracleClientLookupService:
    def __init__(self, resolver: GraphResolver) -> None:
        self._resolver = resolver

    async def get_client_data(
            self, request: NumberInformationRequest
    ) -> NumberInformationResponse:
        return await self._resolver.resolve_fields(request.phone_number, request.fields)

    async def get_clients_data(
            self, request: NumberInformationBulkRequest
    ) -> NumberInformationBulkResponse:
        return await self._resolver.resolve_fields_bulk(request.phone_numbers, request.fields)