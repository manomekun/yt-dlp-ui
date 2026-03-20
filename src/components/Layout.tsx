import type { JSX } from "solid-js";
import { Sidebar } from "./Sidebar.tsx";

interface LayoutProps {
  children: JSX.Element;
  activePage: "download" | "history" | "settings";
  onNavigate: (page: "download" | "history" | "settings") => void;
}

export function Layout(props: LayoutProps) {
  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      <Sidebar activePage={props.activePage} onNavigate={props.onNavigate} />
      <main
        style={{
          flex: 1,
          padding: "24px 28px",
          "overflow-y": "auto",
          display: "flex",
          "flex-direction": "column",
          gap: "20px",
        }}
      >
        {props.children}
      </main>
    </div>
  );
}
