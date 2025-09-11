/**
 * @format
 */

import React from 'react';
import {render} from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  test('renders without crashing', () => {
    // App 컴포넌트가 에러 없이 렌더링되는지 확인
    const {getByTestId} = render(<App />);
    
    // 렌더링이 성공적으로 완료되면 테스트 통과
    expect(() => render(<App />)).not.toThrow();
  });
});
