import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ClimateGame from "@/pages/ClimateGame";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClimateGame />
  </StrictMode>
);
