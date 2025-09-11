/**
 * Niney Life Pickr Mobile App
 * @format
 */

import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider} from 'react-native-elements';
import AppNavigator from './src/navigation/AppNavigator';

const theme = {
  colors: {
    primary: '#7c3aed',
    secondary: '#6b7280',
  },
};

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="#7c3aed"
        />
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
