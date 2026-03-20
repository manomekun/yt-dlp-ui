import { For } from "solid-js";
import logoSrc from "../assets/logo.png";

interface NavItem {
  id: "download" | "history" | "settings";
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: "download", label: "ダウンロード", icon: "↓" },
  { id: "history", label: "履歴", icon: "⟳" },
  { id: "settings", label: "設定", icon: "⚙" },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: "download" | "history" | "settings") => void;
}

export function Sidebar(props: SidebarProps) {
  return (
    <nav
      style={{
        width: "200px",
        "min-width": "200px",
        background: "var(--bg-inset)",
        padding: "24px 16px",
        display: "flex",
        "flex-direction": "column",
        gap: "8px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          "padding-bottom": "16px",
          display: "flex",
          "justify-content": "center",
        }}
      >
        <img
          src={logoSrc}
          alt="TubeSaver"
          style={{
            width: "100%",
            height: "auto",
            "object-fit": "contain",
          }}
          draggable={false}
        />
      </div>

      {/* Navigation */}
      <For each={navItems}>
        {(item) => {
          const isActive = () => props.activePage === item.id;
          return (
            <button
              onClick={() => props.onNavigate(item.id)}
              style={{
                display: "flex",
                "align-items": "center",
                gap: "10px",
                padding: "10px 12px",
                "border-radius": "8px",
                border: "none",
                background: isActive() ? "var(--bg-surface)" : "transparent",
                color: isActive()
                  ? "var(--accent)"
                  : "var(--text-tertiary)",
                "font-size": "13px",
                "font-weight": isActive() ? "600" : "500",
                cursor: "pointer",
                width: "100%",
                "text-align": "left",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              <span style={{ "font-size": "18px", width: "18px", "text-align": "center" }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        }}
      </For>
    </nav>
  );
}
