const { url } = require('inspector')

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './sections/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1440px',
    },
    fontSize: {
      xs: ['12px', '1'],
      sm: ['13px', '1'],
      base: ['14px', '22px'],
      base16: ['16px', '24px'],
      base18: ['18px', '1'],
      lg: ['24px', '30px'],
      xl: ['59px', '1.1'],
    },
    textColor: {
      white: 'rgba(255,255,255,.87)',
      pink: '#D7A5FF',
      scampi: '#696890',
      darkSlateBlue: '#42428E',
      lavenderGray: '#BABAD2',

      light: '#E6DAFE',
      dark: '#110F23',
      'light-50': 'rgba(230, 218, 254, .5)',
    },
    colors: {
      pythPurple: '#7142CF',
      black: '#000',
      mediumSlateBlue: '#8246FA',
      darkSlateBlue: '#42428E',
   
      transparent: 'transparent',
      current: 'currentColor',
      light: '#fff',
      'light-35': 'rgba(255, 255, 255, .35)',
      dark: '#000',
      'dark-300': 'rgba(0, 0, 0, .3)',
      'dark-25': 'rgba(0, 0, 0, 0.25)',
      'dark-70': 'rgba(0, 0, 0, 0.70)',
      darkGray: '#252236',
      darkGray1: '#242235',
      darkGray2: '#312F47',
      darkGray3: '#575572',
      darkGray5: '#44415E',
    },
    fontFamily: {
      body: 'IBM Plex Sans, sans-serif',
      mono: 'IBM Plex Mono, monospace',
      header: ["'Chakra Petch'", 'sans-serif'],
      body: ["'Red Hat Text'", 'sans-serif'],
    },

    extend: {
      spacing: {
        128: '32rem',
        144: '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--gradient-color-stops))',
        radial:
          'radial-gradient(100% 628.91% at 95.63% 10.42%, rgba(230, 218, 254, 0) 0%, #E6DAFE 30.71%, #E6DAFE 71.52%, rgba(230, 218, 254, 0) 100%)',
        radial2:
          'radial-gradient(91.27% 628.91% at 95.63% 10.42%, rgba(75, 52, 122, 0.15) 0%, #4B347A 30.71%, #4B347A 71.52%, rgba(75, 52, 122, 0.19) 100%)',
        check: 'url("../images/check.svg")',
        gradient:
          'linear-gradient(358.04deg, #242235 1.04%, #242235 18.68%, rgba(36, 34, 53, 0) 79.82%);',
        gradient2:
          'linear-gradient(120deg, #1A192C 0%, rgba(26, 25, 44, 0.00) 100%)',
      },
      transition: {
        walletClose: 'all 200ms ease 0s',
      },
      content: {
        li: 'url("../images/li.svg")',
      },
    },
  },
  plugins: [],
}
