import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef()

export const navigate: (name: string, params?: any) => void = (name, params ={}) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}

export const push: (name: string, params?: any) => void = (name, params ={}) => {
  if (navigationRef.isReady()) {
    navigationRef.current?.dispatch(StackActions.push(name, params));
  }
}

export const goBack: () => void = () => {
  if (navigationRef.isReady()) {
    navigationRef.goBack()
  }
}