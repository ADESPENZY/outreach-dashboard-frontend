/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			// One typeface app-wide. The montserrat/roboto keys are kept and
  			// repointed rather than renamed, so all 299 existing font-* classes
  			// pick up Bricolage without a single component file being touched.
  			// Renaming them is a separate, reviewable follow-up.
  			montserrat: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
  			roboto: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
  			// Overrides Tailwind's default, which Preflight applies to <html>,
  			// so unclassed text follows too.
  			sans: ['Bricolage Grotesque', 'system-ui', 'sans-serif']
  		},
  		colors: {
  			// ── Live copilot overlay ──────────────────────────────────────────
  			// The only deliberately dark surface in the app: the interview
  			// answer console, read at a glance over a video call (in-page and in
  			// the Document Picture-in-Picture window). Brand orange stays the
  			// single accent; these are its neutrals.
  			overlay: {
  				DEFAULT: '#0F1115',
  				raised:  '#171A21',
  				line:    '#262B36',
  				text:    '#E7E9EE',
  				muted:   '#98A1B2',
  			},
  			primary: {
  				DEFAULT: '#FF5B2E',
  				dark: '#B82E07',
  				light: '#FF5B2E',
  				foreground: 'hsl(var(--primary-foreground))',
  				// Auth pages: error text and small orange text on dark.
  				tint: '#FF9A7A'
  			},
  			black: {
  				DEFAULT: '#000000',
  				light: '#1A1A1A'
  			},
  			white: '#FFFFFF',
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				light: '#F9FAFB',
  				dark: '#6B7280',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				teal: '#0A9396',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			neutral: {
  				DEFAULT: '#F9FAFB',
  				dark: '#F3F4F6'
  			},
  			// Identity tokens (brand/README.md). Ink is the reversed field and
  			// display type; stone is the warm page ground. Both were previously
  			// only available as one-off hex values.
  			ink: {
  				DEFAULT: '#101010',
  				soft: '#1C1A19',
  				line: '#22201E',
  				// Auth pages (AUTH_DESIGN_GUIDE.md §1).
  				stage: '#161413',    // story panel and input ground
  				raised: '#2A2725',   // avatar circle
  				mute: '#3A3633',     // unlit timeline dot
  				void: '#0B0A0A'      // centre disc of the void
  			},
  			stone: {
  				DEFAULT: '#F4F2F0',
  				line: '#E4E0DC'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			gradient: {
  				orange: 'linear-gradient(135deg, #B82E07 70%, #FF5B2E 30%)'
  			},
  			backgroundImage: {
  				'orange-gradient': 'linear-gradient(135deg, #B82E07 50%, #FF5B2E 50%)'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'slide-progress': {
  				'0%':   { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(250%)' },
  			},
  			// Blinking caret while an answer streams in.
  			'caret': {
  				'0%, 100%': { opacity: '1' },
  				'50%':      { opacity: '0' },
  			},
  			'fade-in': {
  				'0%':   { opacity: '0', transform: 'translateY(8px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  			// ── ApplyDir brand loading system (ui/ApplyDirLoader.jsx) ──
  			// Signature orange highlight sweeping left→right across a track.
  			'shimmer': {
  				'0%':   { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(160%)' },
  			},
  			// Snappy button spinner (slightly faster than animate-spin).
  			'spinner': {
  				'0%':   { transform: 'rotate(0deg)' },
  				'100%': { transform: 'rotate(360deg)' },
  			},
  			'rise': {
  				'0%':   { opacity: '0', transform: 'translateY(14px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  			'marquee': {
  				'0%':   { transform: 'translateX(0)' },
  				'100%': { transform: 'translateX(-50%)' },
  			},
  			// Screen loader exit.
  			'fade-out': {
  				'0%':   { opacity: '1' },
  				'100%': { opacity: '0' },
  			},
  		},
  		animation: {
  			'slide-progress': 'slide-progress 1.4s ease-in-out infinite',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'caret': 'caret 1.1s step-end infinite',
  			'shimmer': 'shimmer 1.5s ease-in-out infinite',
  			'spinner': 'spinner 0.8s linear infinite',
  			'fade-out': 'fade-out 0.3s ease-out forwards',
  			'rise': 'rise 0.55s cubic-bezier(0.16,1,0.3,1) both',
  			'marquee': 'marquee 38s linear infinite',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

