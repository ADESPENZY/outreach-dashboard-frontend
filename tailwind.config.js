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
  			montserrat: [
  				'Montserrat',
  				'sans-serif'
  			],
  			roboto: [
  				'Roboto',
  				'sans-serif'
  			]
  		},
  		colors: {
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
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
  		},
  		animation: {
  			'slide-progress': 'slide-progress 1.4s ease-in-out infinite',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

