import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: "#06080d",
        base: "#0b0f18",
        surface: "rgba(14,19,32,0.72)",
        elevated: "rgba(18,24,42,0.8)",
        card: "rgba(16,22,38,0.65)",
        "card-solid": "#101626",
        glass: "rgba(12,16,28,0.62)",
        "glass-strong": "rgba(10,14,24,0.82)",
        "glass-border": "rgba(255,255,255,0.06)",
        "glass-border-hover": "rgba(255,255,255,0.12)",
        "f-green": "#22c55e",
        "f-red": "#ef4444",
        "f-orange": "#f59e0b",
        "f-blue": "#3b82f6",
        "f-cyan": "#06b6d4",
        "f-purple": "#a855f7",
        "t-primary": "#eaf0fa",
        "t-secondary": "#8494b2",
        "t-muted": "#4d5d7a",
        "t-dim": "#2d3a52",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backdropBlur: {
        glass: "24px",
      },
      borderRadius: {
        f: "8px",
        "f-lg": "12px",
        "f-xl": "16px",
      },
      boxShadow: {
        glass:
          "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        deep: "0 16px 64px rgba(0,0,0,0.6)",
      },
      animation: {
        "slide-up": "slideUp 0.3s ease both",
        blink: "blink 2.5s infinite",
      },
      keyframes: {
        slideUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
