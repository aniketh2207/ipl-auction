// All auction constants in one place — easy to tweak later

module.exports = {
  // Timer
  BID_TIMER_SECONDS: 15,

  // Purse (in Lakhs — 100 Cr = 10000 Lakhs)
  DEFAULT_PURSE: 10000,

  // Team limits
  MIN_TEAMS: 2,
  MAX_TEAMS: 10,

  // Squad rules (IPL)
  MAX_SQUAD_SIZE: 25,
  MIN_SQUAD_SIZE: 18,
  MAX_OVERSEAS: 8,

  // Minimum base price in Lakhs (for purse validation)
  MIN_BASE_PRICE: 30,

  // Bid increment slabs (IPL-style)
  // [maxPrice, increment] — prices in Lakhs
  BID_SLABS: [
    [100, 5],     // Up to 1 Cr: +5L
    [500, 25],    // 1-5 Cr: +25L
    [1000, 50],   // 5-10 Cr: +50L
    [Infinity, 100], // 10+ Cr: +1 Cr
  ],

  // Room code format
  ROOM_CODE_LENGTH: 6,
};
