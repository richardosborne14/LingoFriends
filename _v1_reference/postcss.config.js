/**
 * PostCSS Configuration for LingoFriends
 * 
 * Processes CSS with Tailwind v4 and Autoprefixer for
 * cross-browser compatibility.
 * 
 * Note: Tailwind CSS v4 requires @tailwindcss/postcss
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
