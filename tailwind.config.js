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
  			primary: {
  				DEFAULT: '#FF5B2E',
  				dark: '#B82E07',
  				light: '#FF5B2E',
  				foreground: 'hsl(var(--primary-foreground))'
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
  			// Screen loader exit.
  			'fade-out': {
  				'0%':   { opacity: '1' },
  				'100%': { opacity: '0' },
  			},
  		},
  		animation: {
  			'slide-progress': 'slide-progress 1.4s ease-in-out infinite',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'shimmer': 'shimmer 1.5s ease-in-out infinite',
  			'spinner': 'spinner 0.8s linear infinite',
  			'fade-out': 'fade-out 0.3s ease-out forwards',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

