import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useOnline() {
  const [online, setOnline] = useState<boolean>(true);
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected && !!state.isInternetReachable !== false);
    });
  }, []);
  return online;
}
