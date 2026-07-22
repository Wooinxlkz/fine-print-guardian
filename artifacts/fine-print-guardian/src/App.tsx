import { ThemeProvider } from "@/lib/theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, Router as WouterRouter, Redirect } from "wouter";
import { Shell } from "@/components/layout/Shell";

import { AuthProvider, useAuth } from "@/lib/auth";
import LandingPage from "@/pages/landing";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import NewAnalysis from "@/pages/index";
import DocumentLibrary from "@/pages/documents";
import DocumentAnalysis from "@/pages/document-analysis";
import WatchList from "@/pages/watches";
import Dashboard from "@/pages/dashboard";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

function Protected({ children }: { children: React.ReactNode }) {
  const { isLoaded, user, isGuest } = useAuth();
  if (!isLoaded) return null;
  if (!user && !isGuest) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function HomeRoute() {
  const { isLoaded, user, isGuest } = useAuth();
  if (!isLoaded) return null;
  if (user || isGuest) return <Shell><NewAnalysis /></Shell>;
  return <LandingPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WouterRouter base={basePath}>
            <TooltipProvider>
              <Switch>
                <Route path="/sign-in" component={SignInPage} />
                <Route path="/sign-up" component={SignUpPage} />
                <Route path="/" component={HomeRoute} />
                <Route path="/documents">
                  <Protected><Shell><DocumentLibrary /></Shell></Protected>
                </Route>
                <Route path="/documents/:id">
                  <Protected><Shell><DocumentAnalysis /></Shell></Protected>
                </Route>
                <Route path="/watches">
                  <Protected><Shell><WatchList /></Shell></Protected>
                </Route>
                <Route path="/dashboard">
                  <Protected><Shell><Dashboard /></Shell></Protected>
                </Route>
                <Route component={NotFound} />
              </Switch>
              <Toaster />
            </TooltipProvider>
          </WouterRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
