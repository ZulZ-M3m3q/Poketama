import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { ClerkProvider, SignIn, SignUp, useUser, useClerk, Show } from "@clerk/react";

import Home from "@/pages/Home";
import NfcScanner from "@/pages/NfcScanner";
import Slots from "@/pages/Slots";
import Pokedex from "@/pages/Pokedex";
import Battle from "@/pages/Battle";
import Trade from "@/pages/Trade";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const queryClient = new QueryClient();

function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        afterSignInUrl={basePath || "/"}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        afterSignUpUrl={basePath || "/"}
      />
    </div>
  );
}

function GameRouter() {
  return (
    <MobileFrame>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/nfc" component={NfcScanner} />
        <Route path="/slots" component={Slots} />
        <Route path="/pokedex" component={Pokedex} />
        <Route path="/battle" component={Battle} />
        <Route path="/trade" component={Trade} />
        <Route component={NotFound} />
      </Switch>
    </MobileFrame>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <GameRouter />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== uid) {
        qc.clear();
      }
      prevRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={HomeRoute} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
