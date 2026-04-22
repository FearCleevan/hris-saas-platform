import { createTheme } from '@mui/material/styles';

const baseTheme = {
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  shape: {
    borderRadius: 8,
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#0038a8',
      light: '#3360c0',
      dark: '#002d8a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ce1126',
      light: '#d94054',
      dark: '#a80e1f',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#fcd116',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#4d80d0',
      light: '#6b99db',
      dark: '#0038a8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e04060',
      light: '#e96680',
      dark: '#ce1126',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f1117',
      paper: '#1a1d27',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});
