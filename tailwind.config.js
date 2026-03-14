/**
 * LingoFriends V2 — Tailwind Design System Config
 *
 * All colour tokens, typography, radii, and shadows are defined here.
 * Every UI component derives from these tokens — do NOT hardcode values in components.
 * Reference: docs/new-docs/01-DESIGN-SYSTEM.md
 */
export default {
	content: ['./src/**/*.{svelte,js,ts,html}'],
	theme: {
		extend: {
			colors: {
				// --- Primary: Coral Burst (CTAs, primary buttons) ---
				coral: {
					50: '#FFF5F2',
					100: '#FFE8E0',
					200: '#FFD0C2',
					300: '#FFB098',
					400: '#FF8A6A', // ← primary buttons, CTAs
					500: '#F2663D', // ← hover state
					600: '#D94E28', // ← pressed state / btn shadow
					700: '#B33A1A',
				},

				// --- Secondary: Forest Deep (garden UI, secondary buttons) ---
				forest: {
					50: '#F0F9F4',
					100: '#D8F0E3',
					200: '#B0E0C7',
					300: '#7CCCA5',
					400: '#48B87E', // ← secondary buttons, garden UI, success
					500: '#2D9D62', // ← hover
					600: '#1F7F4C', // ← pressed / btn shadow
					700: '#16613A',
				},

				// --- Reward: Sundrop Gold (currency, rewards, streaks) ---
				sundrop: {
					50: '#FFFDF0',
					100: '#FFF8D6',
					200: '#FFEFAD',
					300: '#FFE47A',
					400: '#FFD84A', // ← sundrop icon, reward animations
					500: '#F5C623', // ← streaks, multipliers
					600: '#D4A810',
					700: '#A88308',
				},

				// --- Supporting: Sky Clarity (info cards, teaching steps) ---
				sky: {
					50: '#F0F7FE',
					300: '#7CC4F5',
					400: '#4AADEE', // ← info cards, teaching steps
					500: '#2B96E0', // ← links
				},

				// --- Supporting: Bloom Pink (celebrations, cherry blossoms) ---
				bloom: {
					300: '#F5A3C7',
					400: '#EE7AAF', // ← cherry blossoms, celebrations
					500: '#E05595', // ← rare rewards
				},

				// --- Supporting: Storm Purple (premium, boss encounters) ---
				storm: {
					400: '#9B7AEE',
					500: '#7C55E0', // ← boss encounters, premium
				},

				// --- Neutral: Bark (text, surfaces, borders) ---
				bark: {
					50: '#FDFCFA', // ← page background
					100: '#F7F4F0', // ← card backgrounds
					150: '#F0ECE6', // ← subtle borders, dividers (custom step)
					200: '#E4DED5', // ← input borders
					300: '#C9C1B5', // ← placeholder text
					400: '#A89E90', // ← secondary text
					500: '#7A7168', // ← body text
					600: '#5C544C', // ← strong text
					700: '#3E3833', // ← headings
					800: '#252220', // ← maximum contrast text
				},
			},

			fontFamily: {
				// Both display and body use Nunito — friendly, rounded, not childish
				display: ['Nunito', 'Segoe UI', 'sans-serif'],
				body: ['Nunito', 'Segoe UI', 'sans-serif'],
				mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
			},

			borderRadius: {
				// Named radii — use these instead of arbitrary px values
				btn: '16px',
				card: '20px',
				input: '14px',
				pill: '100px',
				chip: '100px',
			},

			boxShadow: {
				// 3D "pushable" button shadows — each matches the pressed state colour
				'btn-coral': '0 4px 0 #D94E28',
				'btn-forest': '0 4px 0 #1F7F4C',
				'btn-ghost': '0 3px 0 #E4DED5',
				// Card elevations
				card: '0 2px 8px rgba(0,0,0,0.04)',
				'card-elevated': '0 4px 16px rgba(242, 102, 61, 0.12)',
				// Toast notification
				toast: '0 8px 24px rgba(0,0,0,0.15)',
			},
		},
	},
};
