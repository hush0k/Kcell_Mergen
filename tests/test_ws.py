import asyncio
import websockets

JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzgyMTkyNTQxLCJ0eXBlIjoiYWNjZXNzIn0.6e_BN8WldFFJlededFuigEp8EfQfDjT4AlKl_eUTVCM"

async def test():
    uri = f"ws://localhost:8000/api/v1/notifications/ws?token={JWT}"
    try:
        async with websockets.connect(uri) as ws:
            print("Подключились к WebSocket")
            async for message in ws:
                print(f"Получено: {message}")
    except websockets.exceptions.InvalidStatus as e:
        print(f"Статус: {e.response.status_code}")
        print(f"Тело ответа: {e.response.body.decode()}")

asyncio.run(test())