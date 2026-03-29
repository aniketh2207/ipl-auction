import { io } from "socket.io-client";

// In production (served from same origin), connect to window.location
// In dev, connect to the dev server via env variable
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

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
