import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";

const qc = new QueryClient({ defaultOptions:{ queries:{ staleTime:30_000, retry:1 } } });

function AuthGuard() {
  const { isAuthenticated, hydrate } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    const inAuth = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuth) router.replace("/(auth)/login");
    if (isAuthenticated && inAuth)   router.replace("/(tabs)/home");
  }, [isAuthenticated, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  );
}
