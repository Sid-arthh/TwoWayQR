from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from typing import Dict

app = FastAPI()

# Create a templates folder if you want to be fancy, 
# but for simplicity, we will return raw HTML strings or minimal templates.
templates = Jinja2Templates(directory="templates")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[room_id] = websocket

    def disconnect(self, room_id: str):
        if room_id in self.active_connections:
            del self.active_connections[room_id]

    async def send_url(self, room_id: str, url: str):
        if room_id in self.active_connections:
            await self.active_connections[room_id].send_text(url)
            return True
        return False

manager = ConnectionManager()

@app.get("/")
async def health_check():
    return {"status": "running"}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(room_id)

@app.get("/send", response_class=HTMLResponse)
async def get_send_page(request: Request, room: str):
    return templates.TemplateResponse("sender.html", {"request": request, "room": room})

@app.post("/push")
async def push_url(room: str = Form(...), url: str = Form(...)):
    success = await manager.send_url(room, url)
    if success:
        return """
        <div style="text-align:center; font-family:sans-serif; padding:20px;">
            <h1 style="color:green;">Sent!</h1>
            <p>Check your PC.</p>
            <button onclick="window.close()">Close</button>
        </div>
        """
    return "PC not connected. Try refreshing the extension."
