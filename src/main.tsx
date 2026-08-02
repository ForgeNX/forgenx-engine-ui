import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { NexusShell } from "@/components/nexus/nexus-shell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="min-h-screen bg-background">
      <NexusShell />
    </main>
  </StrictMode>,
);
