/**
 * @format
 */

import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import HomeScreen from '../src/screens/HomeScreen';

describe('HomeScreen', () => {
  test('renders all main elements', () => {
    render(<HomeScreen />);
    
    // 타이틀 확인
    expect(screen.getByText('Niney Life Pickr')).toBeTruthy();
    
    // 서브타이틀 확인
    expect(screen.getByText('인생의 선택을 도와드립니다')).toBeTruthy();
    
    // 카운터 라벨 확인
    expect(screen.getByText('카운터 테스트')).toBeTruthy();
    
    // 메뉴 버튼들 확인
    expect(screen.getByText('음식 선택')).toBeTruthy();
    expect(screen.getByText('장소 선택')).toBeTruthy();
    expect(screen.getByText('활동 선택')).toBeTruthy();
    expect(screen.getByText('설정')).toBeTruthy();
  });

  test('counter starts at 0', () => {
    render(<HomeScreen />);
    
    // 초기 카운터 값이 0인지 확인
    expect(screen.getByText('0')).toBeTruthy();
  });

  test('counter increments when button is pressed', () => {
    render(<HomeScreen />);
    
    // 증가 버튼 찾기
    const incrementButton = screen.getByText('증가');
    
    // 버튼 클릭
    fireEvent.press(incrementButton);
    
    // 카운터가 1로 증가했는지 확인
    expect(screen.getByText('1')).toBeTruthy();
    
    // 다시 클릭
    fireEvent.press(incrementButton);
    
    // 카운터가 2로 증가했는지 확인
    expect(screen.getByText('2')).toBeTruthy();
  });

  test('all menu buttons are touchable', () => {
    render(<HomeScreen />);
    
    const menuButtons = [
      '음식 선택',
      '장소 선택',
      '활동 선택',
      '설정'
    ];
    
    menuButtons.forEach(buttonText => {
      const button = screen.getByText(buttonText);
      expect(button).toBeTruthy();
      
      // 버튼이 눌릴 수 있는지 확인 (에러가 발생하지 않으면 성공)
      fireEvent.press(button);
    });
  });
});