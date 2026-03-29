import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export const socket = io(SERVER_URL, {
  autoConnect: false, // Connect manually after user creates/joins a room
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

// Debug logging in dev
if (import.meta.env.DEV) {
  socket.onAny((event, ...args) => {
    console.log(`[Socket] ${event}`, args);
  });
}
