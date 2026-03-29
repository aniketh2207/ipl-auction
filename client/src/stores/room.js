import { defineStore } from "pinia";
import { socket } from "../socket";

export const useRoomStore = defineStore("room", {
  state: () => ({
    roomId: null,
    teams: {},
    creatorId: null,
    mySocketId: null,
    status: "disconnected", // disconnected | lobby | in_progress | paused | accelerated | finished
    settings: { acceleratedRound: true, selectedSets: [] },
    error: null,
  }),

  getters: {
    isCreator: (state) => state.mySocketId === state.creatorId,
    myTeam: (state) => state.teams[state.mySocketId] || null,
    teamList: (state) => Object.entries(state.teams).map(([id, t]) => ({ id, ...t })),
    teamCount: (state) => Object.keys(state.teams).length,
  },

  actions: {
    createRoom(teamName) {
      socket.connect();
      socket.emit("room:create", { teamName }, (response) => {
        if (response.error) {
          this.error = response.error;
          return;
        }
        this.roomId = response.roomId;
        this.mySocketId = socket.id;
        this.applyRoomUpdate(response.room);
      });
    },

    joinRoom(roomId, teamName) {
      socket.connect();
      socket.emit("room:join", { roomId, teamName }, (response) => {
        if (response.error) {
          this.error = response.error;
          return;
        }
        this.roomId = roomId.toUpperCase();
        this.mySocketId = socket.id;
        this.applyRoomUpdate(response.room);
      });
    },

    updateSettings(settings) {
      socket.emit("room:settings", { roomId: this.roomId, settings }, (res) => {
        if (res.error) this.error = res.error;
      });
    },

    applyRoomUpdate(data) {
      this.teams = data.teams;
      this.creatorId = data.creatorId;
      this.status = data.status;
      this.settings = data.settings;
      this.error = null;
    },

    setupListeners() {
      socket.on("room:updated", (data) => this.applyRoomUpdate(data));
      socket.on("room:creator-changed", ({ newCreatorId }) => {
        this.creatorId = newCreatorId;
      });
      socket.on("connect", () => {
        this.mySocketId = socket.id;
      });
    },

    clearError() {
      this.error = null;
    },
  },
});
