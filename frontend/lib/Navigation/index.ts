import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef()

export const navigate: (name: string, params?: any) => void = (name, params ={}) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}

export const jumpTo: (name: string, params?: any) => void = (name, params ={}) => {
  if (navigationRef.isReady()) {
    navigationRef.jumpTo(name as never, params as never);
  }
}