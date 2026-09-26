import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import LandingApp from "@/landing/LandingApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LandingApp />
  </StrictMode>
);
