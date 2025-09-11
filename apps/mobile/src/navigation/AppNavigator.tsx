import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../screens/HomeScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName = 'home';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Decisions') {
            iconName = 'shuffle';
          } else if (route.name === 'History') {
            iconName = 'history';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#7c3aed',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: '홈',
          headerTitle: 'Niney Life Pickr',
        }}
      />
      <Tab.Screen 
        name="Decisions" 
        component={PlaceholderScreen}
        options={{
          title: '선택',
        }}
      />
      <Tab.Screen 
        name="History" 
        component={PlaceholderScreen}
        options={{
          title: '기록',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={PlaceholderScreen}
        options={{
          title: '설정',
        }}
      />
    </Tab.Navigator>
  );
};

// Placeholder screen for tabs not yet implemented
const PlaceholderScreen = () => {
  const {View, Text, StyleSheet} = require('react-native');
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Coming Soon...</Text>
    </View>
  );
};

const styles = {
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  placeholderText: {
    fontSize: 18,
    color: '#6b7280',
  },
};

// Main App Navigator
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;