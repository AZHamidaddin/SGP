/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Ensure Tailwind scans your HTML file
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all files in src folder with these extensions
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
