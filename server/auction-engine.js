const fs = require("fs");
const path = require("path");
const config = require("./config");
const { getNextBidAmount, canTeamBid } = require("./validators");

// Load player data once at startup
const playersData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "players.json"), "utf-8")
);

// Group players by set (preserves CSV order within each set)
function getPlayersBySet(selectedSets = null) {
  const sets = new Map();
  for (const player of playersData) {
    if (!sets.has(player.setNo)) sets.set(player.setNo, []);
    sets.get(player.setNo).push({ ...player });
  }
  // Sort by set number and return as ordered array
  let result = [...sets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([setNo, players]) => ({ setNo, players }));

  // Filter to selected sets if provided
  if (selectedSets && selectedSets.length > 0) {
    result = result.filter((s) => selectedSets.includes(s.setNo));
  }

  return result;
}

// Return set metadata for lobby UI (set number, role, category, player count)
function getAvailableSets() {
  const sets = new Map();
  for (const player of playersData) {
    if (!sets.has(player.setNo)) {
      sets.set(player.setNo, {
        setNo: player.setNo,
        role: player.role,
        category: player.category,
        count: 0,
      });
    }
    sets.get(player.setNo).count++;
  }

  const roleLabels = {
    BATTER: "Batters",
    "ALL-ROUNDER": "All-Rounders",
    WICKETKEEPER: "Wicketkeepers",
    BOWLER: "Bowlers",
  };

  return [...sets.values()]
    .sort((a, b) => a.setNo - b.setNo)
    .map((s) => ({
      ...s,
      label: `${s.category} ${roleLabels[s.role] || s.role}`,
    }));
}

function initAuction(room, selectedSets = null) {
  const sets = getPlayersBySet(selectedSets);
  room.auction = {
    sets,
    currentSetIndex: 0,
    currentPlayerIndex: 0,
    currentBid: { teamId: null, amount: 0 },
    skipVotes: new Set(),
    withdrawals: new Set(), // teams that withdrew from bidding on current player
    unsoldPlayers: [],
    timer: null,
    timerRemaining: config.BID_TIMER_SECONDS,
    isAccelerated: false,
    history: [], // log of all sold/unsold events
  };
  room.status = "in_progress";
}

function getCurrentPlayer(room) {
  const { auction } = room;
  if (!auction) return null;

  const sets = auction.isAccelerated
    ? [{ setNo: "ACC", players: auction.unsoldPlayers }]
    : auction.sets;

  if (auction.currentSetIndex >= sets.length) return null;
  const set = sets[auction.currentSetIndex];
  if (auction.currentPlayerIndex >= set.players.length) return null;

  return set.players[auction.currentPlayerIndex];
}

function getCurrentSetInfo(room) {
  const { auction } = room;
  if (!auction) return null;

  if (auction.isAccelerated) {
    return { setNo: "ACC", label: "Accelerated Round", playerCount: auction.unsoldPlayers.length };
  }

  const set = auction.sets[auction.currentSetIndex];
  if (!set) return null;

  // Determine set label from first player's role + category
  const first = set.players[0];
  const roleLabels = {
    BATTER: "Batters",
    "ALL-ROUNDER": "All-Rounders",
    WICKETKEEPER: "Wicketkeepers",
    BOWLER: "Bowlers",
  };
  const label = `${first.category} ${roleLabels[first.role] || first.role}`;

  return { setNo: set.setNo, label, playerCount: set.players.length };
}

function placeBid(room, socketId) {
  const { auction } = room;
  const team = room.teams.get(socketId);
  const player = getCurrentPlayer(room);

  if (!auction || !team || !player) return { error: "Invalid state" };
  if (room.status !== "in_progress" && room.status !== "accelerated") {
    return { error: "Auction not active" };
  }
  if (!team.isConnected) return { error: "Team is disconnected" };

  // Can't bid on yourself twice in a row
  if (auction.currentBid.teamId === socketId) {
    return { error: "You're already the highest bidder" };
  }

  // Calculate next bid amount
  const currentAmount = auction.currentBid.amount || player.basePrice;
  const nextAmount = auction.currentBid.teamId
    ? getNextBidAmount(currentAmount) // Increment from current bid
    : player.basePrice; // First bid = base price

  // Validate the bid
  const validation = canTeamBid(team, nextAmount, player);
  if (!validation.valid) {
    return { error: validation.errors[0] };
  }

  // Update bid state
  auction.currentBid = { teamId: socketId, amount: nextAmount };
  auction.skipVotes.clear(); // New bid clears skip votes
  auction.withdrawals.clear(); // New bid resets all withdrawals

  return {
    success: true,
    bid: {
      teamId: socketId,
      teamName: team.name,
      amount: nextAmount,
      playerName: player.name,
    },
  };
}

function voteSkip(room, socketId) {
  const { auction } = room;
  if (!auction) return { error: "No auction" };

  // Can't skip if there's already a bid
  if (auction.currentBid.teamId) {
    return { error: "Cannot skip — there's an active bid" };
  }

  auction.skipVotes.add(socketId);

  // Check if all connected teams voted
  const connectedTeams = [...room.teams.entries()].filter(
    ([, t]) => t.isConnected
  );
  const allVoted = connectedTeams.every(([id]) => auction.skipVotes.has(id));

  return { voted: true, allSkipped: allVoted, votesNeeded: connectedTeams.length, votesReceived: auction.skipVotes.size };
}

function withdrawBid(room, socketId) {
  const { auction } = room;
  if (!auction) return { error: "No auction" };

  // Can't withdraw if there's no active bid
  if (!auction.currentBid.teamId) {
    return { error: "No active bid to withdraw from" };
  }

  // Can't withdraw if you're the current highest bidder
  if (auction.currentBid.teamId === socketId) {
    return { error: "You're the highest bidder — you can't withdraw" };
  }

  // Can't withdraw twice
  if (auction.withdrawals.has(socketId)) {
    return { error: "Already withdrawn" };
  }

  auction.withdrawals.add(socketId);

  // Check if all connected teams except highest bidder have withdrawn
  const connectedTeams = [...room.teams.entries()].filter(
    ([, t]) => t.isConnected
  );
  const nonBidderTeams = connectedTeams.filter(
    ([id]) => id !== auction.currentBid.teamId
  );
  const allWithdrawn = nonBidderTeams.every(([id]) => auction.withdrawals.has(id));

  return {
    withdrawn: true,
    allWithdrawn,
    withdrawCount: auction.withdrawals.size,
    withdrawNeeded: nonBidderTeams.length,
  };
}

function soldPlayer(room) {
  const { auction } = room;
  const player = getCurrentPlayer(room);
  const team = room.teams.get(auction.currentBid.teamId);

  if (!player || !team || !auction.currentBid.teamId) return null;

  // Deduct purse, add to squad
  team.purse -= auction.currentBid.amount;
  team.squad.push({
    ...player,
    isSold: true,
    soldPrice: auction.currentBid.amount,
    soldTo: auction.currentBid.teamId,
  });

  // Log it
  auction.history.push({
    type: "sold",
    player: player.name,
    team: team.name,
    price: auction.currentBid.amount,
  });

  return {
    player,
    teamId: auction.currentBid.teamId,
    teamName: team.name,
    price: auction.currentBid.amount,
  };
}

function unsoldPlayer(room) {
  const { auction } = room;
  const player = getCurrentPlayer(room);
  if (!player) return null;

  // In regular auction, add to unsold pool for accelerated round
  if (!auction.isAccelerated) {
    auction.unsoldPlayers.push(player);
  }

  auction.history.push({ type: "unsold", player: player.name });
  return { player };
}

function advanceToNextPlayer(room) {
  const { auction } = room;

  // Reset bid state
  auction.currentBid = { teamId: null, amount: 0 };
  auction.skipVotes.clear();
  auction.withdrawals.clear();
  auction.timerRemaining = config.BID_TIMER_SECONDS;

  // Move to next player in current set
  auction.currentPlayerIndex++;

  const sets = auction.isAccelerated
    ? [{ setNo: "ACC", players: auction.unsoldPlayers }]
    : auction.sets;

  // If we've finished this set, move to next set
  if (auction.currentSetIndex < sets.length) {
    const currentSet = sets[auction.currentSetIndex];
    if (auction.currentPlayerIndex >= currentSet.players.length) {
      auction.currentSetIndex++;
      auction.currentPlayerIndex = 0;
    }
  }

  // Check if auction is over
  if (auction.currentSetIndex >= sets.length) {
    if (auction.isAccelerated || !room.settings.acceleratedRound) {
      room.status = "finished";
      return { finished: true };
    }
    // Regular auction done, but accelerated round may be triggered by creator
    return { regularDone: true, unsoldCount: auction.unsoldPlayers.length };
  }

  return { player: getCurrentPlayer(room), setInfo: getCurrentSetInfo(room) };
}

function startAcceleratedRound(room) {
  const { auction } = room;
  if (!auction || auction.unsoldPlayers.length === 0) {
    return { error: "No unsold players" };
  }

  auction.isAccelerated = true;
  auction.currentSetIndex = 0;
  auction.currentPlayerIndex = 0;
  auction.currentBid = { teamId: null, amount: 0 };
  auction.skipVotes.clear();
  auction.withdrawals.clear();
  room.status = "accelerated";

  return { player: getCurrentPlayer(room), unsoldCount: auction.unsoldPlayers.length };
}

function getAuctionState(room) {
  if (!room.auction) return null;

  const player = getCurrentPlayer(room);
  const setInfo = getCurrentSetInfo(room);
  const teamSquads = {};

  for (const [socketId, team] of room.teams) {
    teamSquads[socketId] = {
      name: team.name,
      purse: team.purse,
      squad: team.squad,
      squadCount: team.squad.length,
      overseasCount: team.squad.filter((p) => p.isOverseas).length,
    };
  }

  return {
    currentPlayer: player,
    setInfo,
    currentBid: room.auction.currentBid.teamId
      ? {
          teamId: room.auction.currentBid.teamId,
          teamName: room.teams.get(room.auction.currentBid.teamId)?.name,
          amount: room.auction.currentBid.amount,
        }
      : null,
    timerRemaining: room.auction.timerRemaining,
    skipVotes: room.auction.skipVotes.size,
    withdrawals: {
      count: room.auction.withdrawals.size,
      needed: room.auction.currentBid.teamId
        ? [...room.teams.entries()].filter(([id, t]) => t.isConnected && id !== room.auction.currentBid.teamId).length
        : 0,
      teams: [...room.auction.withdrawals],
    },
    teams: teamSquads,
    history: room.auction.history.slice(-10), // Last 10 events
    isAccelerated: room.auction.isAccelerated,
    unsoldCount: room.auction.unsoldPlayers.length,
  };
}

module.exports = {
  initAuction,
  getCurrentPlayer,
  getCurrentSetInfo,
  getAvailableSets,
  placeBid,
  voteSkip,
  withdrawBid,
  soldPlayer,
  unsoldPlayer,
  advanceToNextPlayer,
  startAcceleratedRound,
  getAuctionState,
};
