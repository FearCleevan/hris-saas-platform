import { createTheme } from '@mui/material/styles';

const baseTheme = {
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  shape: {
    borderRadius: 12,
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
      main: '#059669',
      light: '#34a87f',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#fcd116',
    },
    error: {
      main: '#ce1126',
    },
    background: {
      default: '#f0f4ff',
      paper: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
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
      main: '#34d399',
      light: '#6ee7b7',
      dark: '#059669',
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
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});
