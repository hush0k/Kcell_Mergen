from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        if user_id in self._connections:
            self._connections[user_id].remove(websocket)
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def send_to_user(self, user_id: int, message: str) -> None:
        connections = self._connections.get(user_id, [])
        for websocket in connections:
            await websocket.send_json(message)

    def is_online(self, user_id: int) -> bool:
        return user_id in self._connections

manager = ConnectionManager()

