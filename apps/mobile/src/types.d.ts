/**
 * TypeScript 타입 정의: 모듈
 * react-native-svg-transformer를 위한 SVG 모듈 타입 선언
 */

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
