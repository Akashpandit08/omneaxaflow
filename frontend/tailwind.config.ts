import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        surface: {
          DEFAULT:  "#0a0f1e",
          secondary:"#0f172a",
          card:     "#111827",
          elevated: "#1a2235",
          border:   "#1e2d45",
          input:    "#141c2e",
        },
        accent: {
          purple: "#8b5cf6",
          pink:   "#ec4899",
          cyan:   "#06b6d4",
          green:  "#10b981",
          orange: "#f59e0b",
          red:    "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
        "gradient-card":  "linear-gradient(135deg, #111827 0%, #1a2235 100%)",
        "gradient-hero":  "radial-gradient(ellipse at top, #1e1b4b 0%, #0a0f1e 70%)",
        "gradient-glow":  "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)",
        "mesh-pattern":   "radial-gradient(at 27% 37%, hsla(215,98%,61%,0.06) 0px, transparent 50%), radial-gradient(at 97% 21%, hsla(270,98%,61%,0.07) 0px, transparent 50%)",
      },
      boxShadow: {
        "glow-brand": "0 0 20px rgba(99,102,241,0.3)",
        "glow-sm":    "0 0 10px rgba(99,102,241,0.2)",
        "card":       "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15)",
        "modal":      "0 25px 50px rgba(0,0,0,0.8)",
      },
      animation: {
        "fade-in":     "fadeIn 0.2s ease-out",
        "slide-up":    "slideUp 0.25s ease-out",
        "slide-down":  "slideDown 0.25s ease-out",
        "slide-left":  "slideLeft 0.25s ease-out",
        "shimmer":     "shimmer 2s linear infinite",
        "pulse-slow":  "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "bounce-soft": "bounceSoft 1.5s ease-in-out infinite",
        "spin-slow":   "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideLeft: { from: { opacity: "0", transform: "translateX(-8px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        shimmer:   { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
        bounceSoft:{ "0%,100%": { transform: "translateY(-4px)" }, "50%": { transform: "translateY(4px)" } },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
