import pytest
from unittest.mock import AsyncMock

from app.me_note.note.connection_manager import MeNoteConnectionManager


@pytest.mark.asyncio
async def test_broadcast_sends_to_all_connections():
    manager = MeNoteConnectionManager()
    ws1, ws2 = AsyncMock(), AsyncMock()
    manager._connections = [ws1, ws2]

    await manager.broadcast({"note_id": 1, "action": "UPDATE"})

    ws1.send_json.assert_awaited_once_with({"note_id": 1, "action": "UPDATE"})
    ws2.send_json.assert_awaited_once_with({"note_id": 1, "action": "UPDATE"})


@pytest.mark.asyncio
async def test_broadcast_removes_dead_connection():
    manager = MeNoteConnectionManager()
    dead_ws = AsyncMock()
    dead_ws.send_json.side_effect = RuntimeError("closed")
    manager._connections = [dead_ws]

    await manager.broadcast({"note_id": 1, "action": "DELETE"})

    assert dead_ws not in manager._connections