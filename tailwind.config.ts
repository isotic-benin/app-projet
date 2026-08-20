import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0082f0',
                    50: '#e6f4ff',
                    100: '#ccecff',
                    200: '#99d6ff',
                    300: '#66c0ff',
                    400: '#33aaff',
                    500: '#0082f0',
                    600: '#0068c0',
                    700: '#004e90',
                    800: '#003460',
                    900: '#001a30',
                },
                navy: {
                    DEFAULT: '#0B1B33',
                    50: '#e8edf5',
                    100: '#c5d2e6',
                    200: '#8fa5cc',
                    300: '#5978b2',
                    400: '#2b4b8f',
                    500: '#0B1B33',
                    600: '#091628',
                    700: '#07101e',
                    800: '#040b14',
                    900: '#02050a',
                },
                brand: {
                    blue: '#0082f0',
                    navy: '#0B1B33',
                    'light-blue': '#e6f4ff',
                    'mid-blue': '#005bbb',
                },
                surface: '#f4f4f4',
                border: '#e2e8f0',
                success: '#1E9E5A',
                warning: '#E8A000',
                danger: '#D3273E',
            },
            fontFamily: {
                sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            boxShadow: {
                card: '0 4px 24px rgba(0, 0, 0, 0.08)',
                'card-hover': '0 8px 40px rgba(0, 130, 240, 0.15)',
                simulator: '0 20px 60px rgba(0, 0, 0, 0.12)',
            },
            animation: {
                'fade-up': 'fadeUp 0.5s ease-out forwards',
                'fade-in': 'fadeIn 0.3s ease-out forwards',
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
export default config
