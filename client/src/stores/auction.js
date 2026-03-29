import { defineStore } from "pinia";
import { socket } from "../socket";
import { useRoomStore } from "./room";

export const useAuctionStore = defineStore("auction", {
  state: () => ({
    currentPlayer: null,
    setInfo: null,
    currentBid: null,
    timerRemaining: 15,
    skipVotes: { received: 0, needed: 0 },
    withdrawals: { count: 0, needed: 0, teams: [] },
    teams: {},
    history: [],
    isAccelerated: false,
    unsoldCount: 0,
    soldAnimation: null, // { player, teamName, price } — shown briefly
    unsoldAnimation: null, // { player } — shown briefly
    regularDone: false, // true when regular auction ends, waiting for creator decision
  }),

  getters: {
    timerPercent: (state) => (state.timerRemaining / 15) * 100,
    isTimerCritical: (state) => state.timerRemaining <= 5,
    myTeamAuction: (state) => {
      const room = useRoomStore();
      return state.teams[room.mySocketId] || null;
    },
    canIBid: (state) => {
      const room = useRoomStore();
      if (!room.mySocketId || !state.currentPlayer) return false;
      // Can't bid if you're already highest bidder
      if (state.currentBid?.teamId === room.mySocketId) return false;
      // Can't bid if withdrawn
      if (state.withdrawals.teams.includes(room.mySocketId)) return false;
      return true;
    },
  },

  actions: {
    startAuction() {
      const room = useRoomStore();
      const selectedSets = room.settings.selectedSets?.length > 0
        ? room.settings.selectedSets
        : null;
      socket.emit("auction:start", { roomId: room.roomId, selectedSets }, (res) => {
        if (res.error) room.error = res.error;
      });
    },

    placeBid() {
      const room = useRoomStore();
      socket.emit("auction:bid", { roomId: room.roomId }, (res) => {
        if (res.error) room.error = res.error;
      });
    },

    voteSkip() {
      const room = useRoomStore();
      socket.emit("auction:skip-vote", { roomId: room.roomId }, (res) => {
        if (res.error) room.error = res.error;
      });
    },

    withdrawBid() {
      const room = useRoomStore();
      socket.emit("auction:withdraw", { roomId: room.roomId }, (res) => {
        if (res.error) room.error = res.error;
      });
    },

    togglePause() {
      const room = useRoomStore();
      socket.emit("auction:pause", { roomId: room.roomId }, (res) => {
        if (res.error) room.error = res.error;
      });
    },

    triggerAcceleratedRound() {
      const room = useRoomStore();
      socket.emit("auction:accelerated-round", { roomId: room.roomId }, (res) => {
        if (res.error) room.error = res.error;
      });
    },

    finishAuction() {
      const room = useRoomStore();
      socket.emit("auction:finish", { roomId: room.roomId }, (res) => {
        if (res.error) room.error = res.error;
      });
    },

    applyAuctionState(data) {
      if (!data) return;
      this.currentPlayer = data.currentPlayer;
      this.setInfo = data.setInfo;
      this.currentBid = data.currentBid;
      this.timerRemaining = data.timerRemaining;
      this.teams = data.teams;
      this.history = data.history || [];
      this.isAccelerated = data.isAccelerated;
      this.unsoldCount = data.unsoldCount;
      if (data.withdrawals) {
        this.withdrawals = data.withdrawals;
      } else {
        this.withdrawals = { count: 0, needed: 0, teams: [] };
      }
    },

    setupListeners() {
      const room = useRoomStore();

      socket.on("auction:started", (state) => {
        room.status = "in_progress";
        this.applyAuctionState(state);
        this.regularDone = false;
      });

      socket.on("auction:bid-update", ({ bid, timerRemaining }) => {
        this.currentBid = bid;
        this.timerRemaining = timerRemaining;
        // New bid resets all withdrawals
        this.withdrawals = { count: 0, needed: 0, teams: [] };
      });

      socket.on("auction:timer-tick", ({ remaining }) => {
        this.timerRemaining = remaining;
      });

      socket.on("auction:skip-update", ({ votesReceived, votesNeeded }) => {
        this.skipVotes = { received: votesReceived, needed: votesNeeded };
      });

      socket.on("auction:withdraw-update", ({ withdrawCount, withdrawNeeded, withdrawnTeams }) => {
        this.withdrawals = { count: withdrawCount, needed: withdrawNeeded, teams: withdrawnTeams };
      });

      socket.on("auction:sold", ({ player, teamId, teamName, price }) => {
        this.soldAnimation = { player, teamName, price };
        this.currentPlayer = null;
        setTimeout(() => (this.soldAnimation = null), 2800);
      });

      socket.on("auction:unsold", ({ player }) => {
        this.unsoldAnimation = { player };
        this.currentPlayer = null;
        setTimeout(() => (this.unsoldAnimation = null), 1800);
      });

      socket.on("auction:next-player", ({ player, setInfo, state }) => {
        this.applyAuctionState(state);
        this.skipVotes = { received: 0, needed: 0 };
        this.withdrawals = { count: 0, needed: 0, teams: [] };
      });

      socket.on("auction:regular-done", ({ unsoldCount }) => {
        this.regularDone = true;
        this.unsoldCount = unsoldCount;
        this.currentPlayer = null;
      });

      socket.on("auction:accelerated-started", (state) => {
        room.status = "accelerated";
        this.regularDone = false;
        this.applyAuctionState(state);
      });

      socket.on("auction:paused", () => {
        room.status = "paused";
      });

      socket.on("auction:resumed", (state) => {
        room.status = state.isAccelerated ? "accelerated" : "in_progress";
        this.applyAuctionState(state);
      });

      socket.on("auction:finished", (state) => {
        room.status = "finished";
        this.applyAuctionState(state);
      });
    },
  },
});
