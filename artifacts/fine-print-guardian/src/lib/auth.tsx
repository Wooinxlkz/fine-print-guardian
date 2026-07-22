import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGetAuthMe, setAuthTokenGetter, setGuestIdGetter, UserProfile, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

setAuthTokenGetter(() => localStorage.getItem("fpg-auth-token"));
setGuestIdGetter(() => sessionStorage.getItem("guestId"));

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoaded: boolean;
  isGuest: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  loginAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoaded: false,
  isGuest: false,
  login: () => {},
  logout: () => {},
  loginAsGuest: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("fpg-auth-token"));
  const [guestId, setGuestId] = useState<string | null>(sessionStorage.getItem("guestId"));
  const [user, setUser] = useState<UserProfile | null>(null);
  const queryClient = useQueryClient();
  
  const hasToken = !!token;
  
  const { data: authUser, isLoading: isAuthLoading, isError } = useGetAuthMe({
    query: {
      enabled: hasToken && !user,
      staleTime: Infinity,
      retry: false,
      queryKey: getGetAuthMeQueryKey()
    }
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("fpg-auth-token");
      setToken(null);
      setUser(null);
    } else if (authUser) {
      setUser(authUser);
    }
  }, [authUser, isError]);

  const isLoaded = !hasToken || !!user || isError;

  const login = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem("fpg-auth-token", newToken);
    setToken(newToken);
    setUser(newUser);
    if (guestId) {
      sessionStorage.removeItem("guestId");
      setGuestId(null);
    }
    queryClient.clear();
  };

  const logout = () => {
    localStorage.removeItem("fpg-auth-token");
    setToken(null);
    setUser(null);
    if (guestId) {
      sessionStorage.removeItem("guestId");
      setGuestId(null);
    }
    queryClient.clear();
  };

  const loginAsGuest = () => {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const id = "guest_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem("guestId", id);
    setGuestId(id);
    localStorage.removeItem("fpg-auth-token");
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  const isGuest = !user && !!guestId;

  return (
    <AuthContext.Provider value={{ user, token, isLoaded, isGuest, login, logout, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
