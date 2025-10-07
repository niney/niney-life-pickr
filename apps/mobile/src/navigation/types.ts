/**
 * Navigation Types
 * React Navigation 타입 정의
 */

export type RootTabParamList = {
  Home: undefined;
  Restaurant: { placeId?: string };
  Settings: undefined;
};
