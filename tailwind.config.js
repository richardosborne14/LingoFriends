/** @type {import('tailwindcss').Config} */

/**
 * LingoFriends Tailwind Configuration
 * 
 * Duolingo-inspired design system with kid-friendly colors,
 * generous spacing, and playful animations.
 * 
 * @see docs/design-system.md for full documentation
 */
export default {
  content: [
    "./index.html",
    "./*.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ==========================================
      // COLOR PALETTE - Duolingo-inspired
      // ==========================================
      colors: {
        // Primary brand colors
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#58CC02',  // Main green (Duolingo's signature)
          600: '#4CAF00',
          700: '#3d8c00',
          800: '#326e00',
          900: '#285500',
          DEFAULT: '#58CC02',
        },
        
        // Secondary - Electric blue for actions
        secondary: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#1CB0F6',  // Duolingo blue
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          DEFAULT: '#1CB0F6',
        },
        
        // Accent - Warm orange for highlights, XP
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#FF9600',  // Duolingo orange
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#FF9600',
        },
        
        // Streak/Heart - Pink/Red
        streak: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#FF4B4B',  // Duolingo red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          DEFAULT: '#FF4B4B',
        },
        
        // Purple - For premium/special content
        purple: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#CE82FF',  // Duolingo purple
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          DEFAULT: '#CE82FF',
        },
        
        // Surface colors
        surface: {
          50:  '#ffffff',
          100: '#fafafa',
          200: '#f5f5f5',
          300: '#e5e5e5',
          400: '#d4d4d4',
          500: '#a3a3a3',
          600: '#737373',
          700: '#525252',
          800: '#262626',
          900: '#171717',
        },
        
        // Legacy colors (for backward compatibility)
        paper: '#fdfbf7',
        ink: '#2d2d2d',
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      
      // ==========================================
      // TYPOGRAPHY
      // ==========================================
      fontFamily: {
        // Nunito for headings and UI - friendly, rounded
        sans: ['Nunito', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Keep serif for special cases
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        // Monospace for code
        mono: ['Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      
      fontSize: {
        'xs':   ['0.75rem', { lineHeight: '1rem' }],      // 12px
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],       // 16px
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        'xl':   ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
        '2xl':  ['1.5rem', { lineHeight: '2rem' }],       // 24px
        '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
        '4xl':  ['2.25rem', { lineHeight: '2.5rem' }],    // 36px
        '5xl':  ['3rem', { lineHeight: '1' }],            // 48px
        '6xl':  ['3.75rem', { lineHeight: '1' }],         // 60px
      },
      
      // ==========================================
      // SPACING - 8px base unit
      // ==========================================
      spacing: {
        '0':   '0px',
        'px':  '1px',
        '0.5': '0.125rem',  // 2px
        '1':   '0.25rem',   // 4px
        '1.5': '0.375rem',  // 6px
        '2':   '0.5rem',    // 8px  - Base unit
        '2.5': '0.625rem',  // 10px
        '3':   '0.75rem',   // 12px
        '3.5': '0.875rem',  // 14px
        '4':   '1rem',      // 16px - 2x base
        '5':   '1.25rem',   // 20px
        '6':   '1.5rem',    // 24px - 3x base
        '7':   '1.75rem',   // 28px
        '8':   '2rem',      // 32px - 4x base
        '9':   '2.25rem',   // 36px
        '10':  '2.5rem',    // 40px - 5x base
        '11':  '2.75rem',   // 44px - Min touch target
        '12':  '3rem',      // 48px - 6x base
        '14':  '3.5rem',    // 56px
        '16':  '4rem',      // 64px - 8x base
        '20':  '5rem',      // 80px
        '24':  '6rem',      // 96px
        '28':  '7rem',      // 112px
        '32':  '8rem',      // 128px
        '36':  '9rem',      // 144px
        '40':  '10rem',     // 160px
        '44':  '11rem',     // 176px
        '48':  '12rem',     // 192px
        '52':  '13rem',     // 208px
        '56':  '14rem',     // 224px
        '60':  '15rem',     // 240px
        '64':  '16rem',     // 256px
        '72':  '18rem',     // 288px
        '80':  '20rem',     // 320px
        '96':  '24rem',     // 384px
      },
      
      // ==========================================
      // BORDER RADIUS - Very rounded for friendliness
      // ==========================================
      borderRadius: {
        'none': '0',
        'sm':   '0.25rem',   // 4px
        'DEFAULT': '0.5rem', // 8px
        'md':   '0.5rem',    // 8px
        'lg':   '0.75rem',   // 12px
        'xl':   '1rem',      // 16px
        '2xl':  '1.25rem',   // 20px
        '3xl':  '1.5rem',    // 24px
        '4xl':  '2rem',      // 32px - Chunky buttons
        'full': '9999px',    // Pills and circles
      },
      
      // ==========================================
      // SHADOWS - Soft, playful depth
      // ==========================================
      boxShadow: {
        'none': 'none',
        'sm':   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md':   '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg':   '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl':   '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl':  '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        // Custom playful shadows
        'button': '0 4px 0 0 rgb(0 0 0 / 0.15)',        // 3D button effect
        'button-hover': '0 2px 0 0 rgb(0 0 0 / 0.15)', // Pressed state
        'card': '0 4px 12px 0 rgb(0 0 0 / 0.08)',      // Floating card
        'card-hover': '0 8px 24px 0 rgb(0 0 0 / 0.12)', // Card lift
        'glow-primary': '0 0 20px 0 rgba(88, 204, 2, 0.3)',   // Green glow
        'glow-secondary': '0 0 20px 0 rgba(28, 176, 246, 0.3)', // Blue glow
        'glow-accent': '0 0 20px 0 rgba(255, 150, 0, 0.3)',    // Orange glow
      },
      
      // ==========================================
      // ANIMATIONS
      // ==========================================
      animation: {
        // Standard animations
        'spin': 'spin 1s linear infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        
        // Custom kid-friendly animations
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop': 'pop 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'celebrate': 'celebrate 0.6s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
        'scale-in': 'scaleIn 0.2s ease-out',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
      },
      
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        celebrate: {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.2) rotate(-5deg)' },
          '50%': { transform: 'scale(1.2) rotate(5deg)' },
          '75%': { transform: 'scale(1.1) rotate(-2deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.1)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '56%': { transform: 'scale(1)' },
        },
      },
      
      // ==========================================
      // TRANSITIONS
      // ==========================================
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      
      // ==========================================
      // Z-INDEX SCALE
      // ==========================================
      zIndex: {
        '0': '0',
        '10': '10',       // Base content
        '20': '20',       // Floating elements
        '30': '30',       // Dropdowns
        '40': '40',       // Fixed headers
        '50': '50',       // Modals
        '60': '60',       // Toast notifications
        '70': '70',       // Tooltips
        '80': '80',       // Confetti/celebrations
        '90': '90',       // Debug overlays
        '100': '100',     // Maximum
      },
      
      // ==========================================
      // MIN/MAX SIZING
      // ==========================================
      minHeight: {
        'touch': '44px',  // Minimum touch target
        'button': '48px', // Standard button height
      },
      minWidth: {
        'touch': '44px',  // Minimum touch target
        'button': '120px', // Minimum button width
      },
    },
  },
  plugins: [],
}
