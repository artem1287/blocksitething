import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Pause } from "./Pause";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Pause />
  </StrictMode>,
);
