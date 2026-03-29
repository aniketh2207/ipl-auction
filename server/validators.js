const config = require("./config");

// Bid validation, purse checks, squad rules

function getNextBidAmount(currentPrice) {
  for (const [maxPrice, increment] of config.BID_SLABS) {
    if (currentPrice < maxPrice) {
      return currentPrice + increment;
    }
  }
}

function canTeamBid(team, nextBidAmount, player) {
  const errors = [];

  // Squad size check
  if (team.squad.length >= config.MAX_SQUAD_SIZE) {
    errors.push("Squad is full (25 players)");
  }

  // Overseas limit
  if (player.isOverseas && getOverseasCount(team) >= config.MAX_OVERSEAS) {
    errors.push("Max 8 overseas players reached");
  }

  // Purse check: can they afford this bid AND still fill min squad at base price?
  const remainingSlots = config.MIN_SQUAD_SIZE - team.squad.length - 1;
  const reserveNeeded = Math.max(0, remainingSlots) * config.MIN_BASE_PRICE;
  const purseAfterBid = team.purse - nextBidAmount;

  if (purseAfterBid < 0) {
    errors.push("Not enough purse");
  } else if (purseAfterBid < reserveNeeded) {
    errors.push("Must keep enough purse to fill minimum squad");
  }

  return { valid: errors.length === 0, errors };
}

function getOverseasCount(team) {
  return team.squad.filter((p) => p.isOverseas).length;
}

module.exports = { getNextBidAmount, canTeamBid, getOverseasCount };
