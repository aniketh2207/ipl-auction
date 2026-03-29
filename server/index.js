const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const config = require("./config");
const roomManager = require("./room-manager");
const auction = require("./auction-engine");

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// Active timers per room
const roomTimers = new Map();

// ─── REST endpoints ──────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", rooms: roomManager.rooms.size });
});

// Available player sets for lobby configuration
app.get("/api/sets", (req, res) => {
  res.json(auction.getAvailableSets());
});

// ─── Socket.io events ────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  // ── Room events ──

  socket.on("room:create", ({ teamName }, callback) => {
    if (!teamName?.trim()) return callback({ error: "Team name required" });

    const room = roomManager.createRoom(socket.id, teamName.trim());
    socket.join(room.roomId);
    console.log(`Room ${room.roomId} created by ${teamName}`);
    callback({ roomId: room.roomId, room: roomManager.serializeRoom(room) });
  });

  socket.on("room:join", ({ roomId, teamName }, callback) => {
    if (!roomId || !teamName?.trim()) {
      return callback({ error: "Room ID and team name required" });
    }

    const result = roomManager.joinRoom(roomId.toUpperCase(), socket.id, teamName.trim());
    if (result.error) return callback({ error: result.error });

    socket.join(roomId);
    console.log(`${teamName} joined room ${roomId}`);

    // Notify everyone in the room
    io.to(roomId).emit("room:updated", roomManager.serializeRoom(result.room));
    callback({ room: roomManager.serializeRoom(result.room) });
  });

  socket.on("room:settings", ({ roomId, settings }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });
    if (room.creatorId !== socket.id) return callback({ error: "Only room creator can change settings" });

    if (settings.acceleratedRound !== undefined) {
      room.settings.acceleratedRound = settings.acceleratedRound;
    }
    if (settings.selectedSets !== undefined) {
      room.settings.selectedSets = settings.selectedSets;
    }

    io.to(roomId).emit("room:updated", roomManager.serializeRoom(room));
    callback({ success: true });
  });

  socket.on("room:get-sets", (_, callback) => {
    callback({ sets: auction.getAvailableSets() });
  });

  // ── Auction events ──

  socket.on("auction:start", ({ roomId, selectedSets }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });
    if (room.creatorId !== socket.id) return callback({ error: "Only room creator can start" });
    if (room.teams.size < config.MIN_TEAMS) return callback({ error: `Need at least ${config.MIN_TEAMS} teams` });
    if (room.status !== "lobby") return callback({ error: "Already started" });

    // Use selectedSets from the start event, fallback to room settings
    const sets = selectedSets || room.settings.selectedSets || null;
    auction.initAuction(room, sets);
    const state = auction.getAuctionState(room);

    io.to(roomId).emit("auction:started", state);
    startTimer(roomId);
    callback({ success: true });
  });

  socket.on("auction:bid", ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });

    const result = auction.placeBid(room, socket.id);
    if (result.error) return callback({ error: result.error });

    // Reset timer on new bid
    resetTimer(roomId);

    io.to(roomId).emit("auction:bid-update", {
      bid: result.bid,
      timerRemaining: config.BID_TIMER_SECONDS,
    });
    callback({ success: true });
  });

  socket.on("auction:skip-vote", ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });

    const result = auction.voteSkip(room, socket.id);
    if (result.error) return callback({ error: result.error });

    io.to(roomId).emit("auction:skip-update", {
      votesReceived: result.votesReceived,
      votesNeeded: result.votesNeeded,
    });

    // If all teams voted to skip, mark unsold immediately
    if (result.allSkipped) {
      handleUnsold(roomId);
    }

    callback({ success: true });
  });

  socket.on("auction:withdraw", ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });

    const result = auction.withdrawBid(room, socket.id);
    if (result.error) return callback({ error: result.error });

    io.to(roomId).emit("auction:withdraw-update", {
      withdrawCount: result.withdrawCount,
      withdrawNeeded: result.withdrawNeeded,
      withdrawnTeams: [...room.auction.withdrawals],
    });

    // If all non-bidder teams withdrew, sell immediately
    if (result.allWithdrawn) {
      clearTimer(roomId);
      handleSold(roomId);
    }

    callback({ success: true });
  });

  socket.on("auction:pause", ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });
    if (room.creatorId !== socket.id) return callback({ error: "Only creator can pause" });

    if (room.status === "paused") {
      // Resume
      room.status = room.auction.isAccelerated ? "accelerated" : "in_progress";
      startTimer(roomId);
      io.to(roomId).emit("auction:resumed", auction.getAuctionState(room));
    } else {
      // Pause
      room.status = "paused";
      clearTimer(roomId);
      io.to(roomId).emit("auction:paused");
    }
    callback({ success: true });
  });

  socket.on("auction:accelerated-round", ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });
    if (room.creatorId !== socket.id) return callback({ error: "Only creator can trigger" });

    const result = auction.startAcceleratedRound(room);
    if (result.error) return callback({ error: result.error });

    io.to(roomId).emit("auction:accelerated-started", auction.getAuctionState(room));
    startTimer(roomId);
    callback({ success: true });
  });

  socket.on("auction:finish", ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });
    if (room.creatorId !== socket.id) return callback({ error: "Only creator can finish" });

    room.status = "finished";
    clearTimer(roomId);
    io.to(roomId).emit("auction:finished", auction.getAuctionState(room));
    callback({ success: true });
  });

  // ── Co-owner ──

  socket.on("team:assign-coowner", ({ roomId, coOwnerSocketId }, callback) => {
    const result = roomManager.assignCoOwner(roomId, socket.id, coOwnerSocketId);
    callback(result);
  });

  // ── State sync (for reconnection) ──

  socket.on("auction:get-state", ({ roomId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ error: "Room not found" });

    callback({
      room: roomManager.serializeRoom(room),
      auction: auction.getAuctionState(room),
    });
  });

  // ── Disconnect ──

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
    const result = roomManager.leaveRoom(socket.id);
    if (result.roomId && !result.deleted) {
      const room = roomManager.getRoom(result.roomId);
      if (room) {
        io.to(result.roomId).emit("room:updated", roomManager.serializeRoom(room));
        if (result.transferred) {
          io.to(result.roomId).emit("room:creator-changed", {
            newCreatorId: result.newOwnerId,
          });
        }
      }
    }
  });
});

// ─── Timer management ────────────────────────────────────────

function startTimer(roomId) {
  clearTimer(roomId); // Clear any existing timer

  const interval = setInterval(() => {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.auction) {
      clearTimer(roomId);
      return;
    }

    room.auction.timerRemaining--;

    io.to(roomId).emit("auction:timer-tick", {
      remaining: room.auction.timerRemaining,
    });

    if (room.auction.timerRemaining <= 0) {
      clearTimer(roomId);
      handleTimerExpired(roomId);
    }
  }, 1000);

  roomTimers.set(roomId, interval);
}

function resetTimer(roomId) {
  const room = roomManager.getRoom(roomId);
  if (room?.auction) {
    room.auction.timerRemaining = config.BID_TIMER_SECONDS;
  }
  startTimer(roomId);
}

function clearTimer(roomId) {
  const interval = roomTimers.get(roomId);
  if (interval) {
    clearInterval(interval);
    roomTimers.delete(roomId);
  }
}

function handleTimerExpired(roomId) {
  const room = roomManager.getRoom(roomId);
  if (!room?.auction) return;

  if (room.auction.currentBid.teamId) {
    handleSold(roomId);
  } else {
    handleUnsold(roomId);
  }
}

function handleSold(roomId) {
  const room = roomManager.getRoom(roomId);
  const result = auction.soldPlayer(room);
  if (!result) return;

  io.to(roomId).emit("auction:sold", {
    player: result.player,
    teamId: result.teamId,
    teamName: result.teamName,
    price: result.price,
  });

  // Short delay before next player (for sold animation)
  setTimeout(() => advanceAuction(roomId), 3000);
}

function handleUnsold(roomId) {
  const room = roomManager.getRoom(roomId);
  const result = auction.unsoldPlayer(room);
  if (!result) return;

  io.to(roomId).emit("auction:unsold", { player: result.player });

  // Short delay before next player
  setTimeout(() => advanceAuction(roomId), 2000);
}

function advanceAuction(roomId) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const result = auction.advanceToNextPlayer(room);

  if (result.finished) {
    room.status = "finished";
    io.to(roomId).emit("auction:finished", auction.getAuctionState(room));
    return;
  }

  if (result.regularDone) {
    // Regular auction done — notify creator about accelerated round option
    io.to(roomId).emit("auction:regular-done", {
      unsoldCount: result.unsoldCount,
    });
    return;
  }

  // Emit new player
  io.to(roomId).emit("auction:next-player", {
    player: result.player,
    setInfo: result.setInfo,
    state: auction.getAuctionState(room),
  });

  startTimer(roomId);
}

// ─── Start server ────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🏏 IPL Auction Server running on port ${PORT}`);
  console.log(`   REST: http://localhost:${PORT}/api/health`);
  console.log(`   WebSocket: ws://localhost:${PORT}\n`);
});
