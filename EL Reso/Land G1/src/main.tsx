import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import GamePage from "./game/GamePage";
import Home from "./home/Home";
import "./index.css";

// No router: a tiny hash-based page switch inside one <AnimatePresence>.
// The game is also reachable standalone via /#/play — external pages can use
// a normal redirect (window.location.href = "/#/play").
const pageFromUrl = () => (window.location.hash.replace(/^#\/?/, "") === "play" ? "play" : "home");

function Router() {
  const [page, setPage] = useState(pageFromUrl);
  useEffect(() => {
    const onChange = () => setPage(pageFromUrl());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (to: string) => {
    window.location.hash = to === "home" ? "" : `/${to}`;
  };

  // Pages animate their own entrance; AnimatePresence mode="wait" deadlocks
  // page swaps under React 18 StrictMode, so it is intentionally not used here.
  return page === "play" ? (
    <GamePage onHome={() => navigate("home")} />
  ) : (
    <Home onPlay={() => navigate("play")} />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>
);
