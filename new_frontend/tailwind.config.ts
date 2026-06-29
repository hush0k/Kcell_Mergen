import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Типографика Mergen: Gros Ventre только для логотипа, Plex Sans для интерфейса.
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        logo: ['"Gros Ventre"', "Georgia", "serif"],
      },
      colors: {
        // Цвета читаются из CSS-переменных, поэтому темы меняются без переписывания классов.
        mg: {
          purple: "var(--mg-purple)",
          "purple-deep": "var(--mg-purple-deep)",
          "purple-2": "var(--mg-purple-2)",
          "purple-soft": "var(--mg-purple-soft)",
          "purple-soft-2": "var(--mg-purple-soft-2)",
            "purple-soft-3": "var(--mg-purple-soft-3)",
          lime: "var(--mg-lime)",
          "lime-soft": "var(--mg-lime-soft)",
          bg: "var(--mg-bg)",
          surface: "var(--mg-surface)",
          "surface-2": "var(--mg-surface-2)",
          border: "var(--mg-border)",
          text: "var(--mg-text)",
          "text-2": "var(--mg-text-2)",
          "text-3": "var(--mg-text-3)",
          success: {
            bg: "var(--mg-success-bg)",
            fg: "var(--mg-success-fg)",
          },
          danger: {
            bg: "var(--mg-danger-bg)",
            fg: "var(--mg-danger-fg)",
          },
          info: {
            bg: "var(--mg-info-bg)",
            fg: "var(--mg-info-fg)",
          },
          warning: {
            bg: "var(--mg-warning-bg)",
            fg: "var(--mg-warning-fg)",
          },
            "completed":   { bg: "var(--mg-completed-bg)" },
            "in-process":  { bg: "var(--mg-in-process-bg)" },
            "not-started": { bg: "var(--mg-not-started-bg)" },
            "overdue":     { bg: "var(--mg-overdue-bg)" },
        },
      },
      borderRadius: {
        icon: "8px",
        control: "11px",
        panel: "14px",
        table: "16px",
        login: "26px",
      },
      boxShadow: {
        "mg-table": "0 10px 30px -22px var(--mg-shadow)",
        "mg-panel": "0 8px 24px -16px var(--mg-shadow)",
        "mg-modal": "0 16px 40px -12px rgba(0,0,0,0.4)",
        "mg-login": "0 30px 70px -28px var(--mg-shadow-lg)",
        "mg-focus": "0 0 0 4px var(--mg-purple-soft)",
      },
      keyframes: {
        mgDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        mgFade: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        mgToast: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "mg-down": "mgDown 0.2s ease",
        "mg-fade": "mgFade 0.5s ease",
        "mg-toast": "mgToast 0.25s ease",
      },
    },
  },
  plugins: [],
} satisfies Config;
