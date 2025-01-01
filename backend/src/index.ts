import { WebSocket, WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import "dotenv/config";

interface Message {
  type: string;
  roomCode: string;
  message?: string;
}

interface MessageInfo {
  id: string;
  message: string;
  time: string;
  userId: string;
}

interface Room {
  users: Map<string, WebSocket>;
  messages: MessageInfo[];
  createdAt: Date;
}

const MAX_MESSAGE_LENGTH = 1000;
const MAX_ROOM_HISTORY = 100;
const ROOM_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;
const PING_INTERVAL = 30000;

const rooms: Map<string, Room> = new Map();
const userSockets: Map<WebSocket, string> = new Map();

const wss = new WebSocketServer({
  port: parseInt(process.env.WESOCKET_SERVER_PORT!) as number,
});

function cleanupOldRooms() {
  const now = new Date();
  rooms.forEach((room, roomCode) => {
    const roomAge = now.getTime() - room.createdAt.getTime();
    if (roomAge > ROOM_CLEANUP_INTERVAL && room.users.size === 0) {
      rooms.delete(roomCode);
    }
  });
}

function broadcastToRoom(room: Room, message: any, excludeSocket?: WebSocket) {
  room.users.forEach((userSocket, userId) => {
    if (!excludeSocket || userSocket !== excludeSocket) {
      if (userSocket.readyState === WebSocket.OPEN) {
        userSocket.send(JSON.stringify(message));
      }
    }
  });
}

function validateMessage(message: string) {
  return message && message.length > 0 && message.length <= MAX_MESSAGE_LENGTH;
}

setInterval(cleanupOldRooms, ROOM_CLEANUP_INTERVAL);

wss.on("connection", (socket: WebSocket) => {
  console.log("New client connected");
  let pingTimeout: NodeJS.Timeout;

  const heartbeat = () => {
    clearTimeout(pingTimeout);
    pingTimeout = setTimeout(() => {
      socket.terminate();
    }, PING_INTERVAL + 1000);
  };

  socket.on("pong", heartbeat);
  const pingInterval = setInterval(() => {
    socket.ping();
  }, PING_INTERVAL);

  socket.on("message", async (rawMessage: string) => {
    try {
      const data: Message = JSON.parse(rawMessage.toString());
      const roomCode = data.roomCode?.trim();

      if (!roomCode) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Room code is required.",
          })
        );
        return;
      }

      switch (data.type) {
        case "createRoom": {
          if (rooms.has(roomCode)) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Room already exists.",
              })
            );
            return;
          }

          const userId = randomUUID();
          const room: Room = {
            users: new Map([[userId, socket]]),
            messages: [],
            createdAt: new Date(),
          };

          rooms.set(roomCode, room);
          userSockets.set(socket, roomCode);

          socket.send(
            JSON.stringify({
              type: "roomCreated",
              roomCode,
              userId,
            })
          );

          break;
        }

        case "joinRoom": {
          const room = rooms.get(roomCode);
          if (!room) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Room does not exist.",
              })
            );
            return;
          }

          const userId = randomUUID();
          room.users.set(userId, socket);
          userSockets.set(socket, roomCode);

          socket.send(
            JSON.stringify({
              type: "roomJoined",
              roomCode,
              userId,
              messages: room.messages,
              usersOnline: room.users.size,
            })
          );

          broadcastToRoom(
            room,
            {
              type: "userJoined",
              message: "A new user has joined the room.",
              usersOnline: room.users.size,
            },
            socket
          );

          break;
        }

        case "message": {
          const room = rooms.get(roomCode);
          if (!room) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Room does not exist.",
              })
            );
            return;
          }

          if (!validateMessage(data.message || "")) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Invalid message format or length.",
              })
            );
            return;
          }

          const messageInfo: MessageInfo = {
            id: randomUUID(),
            message: data.message!,
            time: new Date().toISOString(),
            userId:
              Array.from(room.users.entries()).find(
                ([_, sock]) => sock === socket
              )?.[0] || "unknown",
          };

          room.messages.push(messageInfo);
          if (room.messages.length > MAX_ROOM_HISTORY) {
            room.messages = room.messages.slice(-MAX_ROOM_HISTORY);
          }

          broadcastToRoom(room, {
            type: "message",
            ...messageInfo,
          });

          break;
        }

        default:
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid request type.",
            })
          );
      }
    } catch (error) {
      console.error("Error handling message:", error);
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format.",
        })
      );
    }
  });

  socket.on("close", () => {
    clearInterval(pingInterval);
    clearTimeout(pingTimeout);

    const roomCode = userSockets.get(socket);
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        // Find and remove the user
        for (const [userId, sock] of room.users.entries()) {
          if (sock === socket) {
            room.users.delete(userId);
            break;
          }
        }

        if (room.users.size > 0) {
          broadcastToRoom(room, {
            type: "userLeft",
            message: "A user has left the room.",
            usersOnline: room.users.size,
          });
        } else {
          rooms.delete(roomCode);
        }
      }
      userSockets.delete(socket);
    }
    console.log("Client disconnected");
  });
});

// Error handling for the server
wss.on("error", (error) => {
  console.error("WebSocket Server Error:", error);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing WebSocket server...");
  wss.close(() => {
    console.log("WebSocket server closed.");
    process.exit(0);
  });
});

console.log(
  `WebSocket Server started on port ${process.env.WESOCKET_SERVER_PORT}`
);
