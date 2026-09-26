import { useEffect } from "react";

// Placeholder kept for convenience: redirect any bare load to the home page.
export default function App() {
  useEffect(() => {
    if (!window.location.hash) window.location.hash = "";
  }, []);
  return null;
}
