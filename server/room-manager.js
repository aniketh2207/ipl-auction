const config = require("./config");

// In-memory store: roomId → room object
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < config.ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createRoom(socketId, teamName) {
  let roomId;
  // Ensure unique room code
  do {
    roomId = generateRoomCode();
  } while (rooms.has(roomId));

  const room = {
    roomId,
    creatorId: socketId,
    settings: {
      acceleratedRound: true,
      pursePerTeam: config.DEFAULT_PURSE,
      selectedSets: [], // empty = all sets
    },
    status: "lobby", // lobby | in_progress | paused | accelerated | finished
    teams: new Map(),
    // Auction state (set by auction-engine when started)
    auction: null,
  };

  // Add the creator as the first team
  room.teams.set(socketId, {
    name: teamName,
    purse: config.DEFAULT_PURSE,
    squad: [],
    coOwnerId: null,
    isConnected: true,
  });

  rooms.set(roomId, room);
  return room;
}

function joinRoom(roomId, socketId, teamName) {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found" };
  if (room.status !== "lobby") return { error: "Auction already in progress" };
  if (room.teams.size >= config.MAX_TEAMS) return { error: "Room is full" };

  // Check for duplicate team name
  for (const [, team] of room.teams) {
    if (team.name.toLowerCase() === teamName.toLowerCase()) {
      return { error: "Team name already taken" };
    }
  }

  room.teams.set(socketId, {
    name: teamName,
    purse: config.DEFAULT_PURSE,
    squad: [],
    coOwnerId: null,
    isConnected: true,
  });

  return { room };
}

function leaveRoom(socketId) {
  for (const [roomId, room] of rooms) {
    if (room.teams.has(socketId)) {
      const team = room.teams.get(socketId);

      // If co-owner exists, transfer ownership
      if (team.coOwnerId) {
        const coOwnerId = team.coOwnerId;
        team.coOwnerId = null;
        room.teams.set(coOwnerId, team);
        room.teams.delete(socketId);

        // If this was the room creator, transfer room creator too
        if (room.creatorId === socketId) {
          room.creatorId = coOwnerId;
        }
        return { roomId, transferred: true, newOwnerId: coOwnerId };
      }

      // In lobby, just remove them
      if (room.status === "lobby") {
        room.teams.delete(socketId);
      } else {
        // Mid-auction, mark disconnected (keep their squad/purse)
        team.isConnected = false;
      }

      // If room creator leaves and no transfer, pick a new creator
      if (room.creatorId === socketId && room.teams.size > 0) {
        room.creatorId = room.teams.keys().next().value;
      }

      // Clean up empty rooms
      if (room.teams.size === 0) {
        rooms.delete(roomId);
        return { roomId, deleted: true };
      }

      return { roomId, left: true };
    }
  }
  return { error: "Not in any room" };
}

function assignCoOwner(roomId, socketId, coOwnerSocketId) {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found" };

  const team = room.teams.get(socketId);
  if (!team) return { error: "You're not in this room" };

  team.coOwnerId = coOwnerSocketId;
  return { success: true };
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function getRoomBySocket(socketId) {
  for (const [roomId, room] of rooms) {
    if (room.teams.has(socketId)) return { roomId, room };
    // Also check co-owners
    for (const [ownerId, team] of room.teams) {
      if (team.coOwnerId === socketId) return { roomId, room, asCoOwner: true, ownerId };
    }
  }
  return null;
}

// Serialize room for sending to clients (Maps → plain objects)
function serializeRoom(room) {
  const teams = {};
  for (const [socketId, team] of room.teams) {
    teams[socketId] = {
      name: team.name,
      purse: team.purse,
      squadCount: team.squad.length,
      overseasCount: team.squad.filter((p) => p.isOverseas).length,
      isConnected: team.isConnected,
      hasCoOwner: !!team.coOwnerId,
    };
  }

  return {
    roomId: room.roomId,
    creatorId: room.creatorId,
    status: room.status,
    settings: room.settings,
    teams,
    teamCount: room.teams.size,
  };
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  assignCoOwner,
  getRoom,
  getRoomBySocket,
  serializeRoom,
  rooms,
};
