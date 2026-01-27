import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

/*
  Dumb relay:
  - no logging message content
  - no storage
  - no inspection
*/

wss.on("connection", (socket) => {
  socket.on("message", (data) => {
    // relay to everyone else
    wss.clients.forEach((client) => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

console.log("🔐 WebSocket Relay running on ws://localhost:8080");
