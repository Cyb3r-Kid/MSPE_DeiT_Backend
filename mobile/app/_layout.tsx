import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '../store/session';
import { useConnection } from '../store/connection';

const queryClient = new QueryClient();

export default function Layout() {
  const initSession = useSession((s) => s.initialize);
  const initConnection = useConnection((s) => s.initialize);

  useEffect(() => {
    initConnection();
    initSession();
  }, [initConnection, initSession]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
