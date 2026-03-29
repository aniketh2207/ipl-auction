import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import Lobby from "../views/Lobby.vue";
import Auction from "../views/Auction.vue";
import Results from "../views/Results.vue";

const routes = [
  { path: "/", name: "Home", component: Home },
  { path: "/lobby/:roomId", name: "Lobby", component: Lobby, props: true },
  { path: "/auction/:roomId", name: "Auction", component: Auction, props: true },
  { path: "/results/:roomId", name: "Results", component: Results, props: true },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
