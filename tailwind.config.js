/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "var(--primary)",
                "bg-page": "var(--bg-page)",
                "text-main": "var(--text-main)",
                "text-muted": "var(--text-muted)",
                "border-light": "var(--border-light)",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
        },
    },
    plugins: [],
}
