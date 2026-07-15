from fastapi import WebSocket

class MeNoteConnectionManager:
    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self._connections:
            self._connections.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        for ws in list(self._connections):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)

manager = MeNoteConnectionManager()