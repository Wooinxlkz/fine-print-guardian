import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserRound, Loader2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { login, loginAsGuest } = useAuth();
  const authLogin = useAuthLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    authLogin.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          setLocation("/");
        },
        onError: (err: any) => {
          setError(err?.response?.data?.error || "Invalid email or password");
        }
      }
    );
  };

  const handleGuest = () => {
    loginAsGuest();
    setLocation("/");
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 py-10 gap-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-[400px] bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-5 text-center border-b border-border">
          <Link href="/" className="inline-block">
            <ShieldAlert className="w-10 h-10 text-primary mx-auto mb-3 cursor-pointer" />
          </Link>
          <h1 className="font-serif text-xl font-medium text-foreground tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-sm font-sans mt-1">Sign in to access your contracts</p>
        </div>

        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className="bg-secondary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="bg-secondary/30"
              />
            </div>
            
            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" disabled={authLogin.isPending} className="w-full mt-2 font-medium">
              {authLogin.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button variant="outline" onClick={handleGuest} className="w-full text-muted-foreground hover:text-foreground">
            <UserRound className="w-4 h-4 mr-2" />
            Continue as Guest
          </Button>
          <p className="text-center text-[11px] text-muted-foreground font-sans mt-3">
            No account needed.&nbsp;
            <span className="text-destructive/80">Data disappears when you close the tab.</span>
          </p>
        </div>

        <div className="px-8 pb-6 text-center border-t border-border pt-5 bg-muted/20">
          <p className="text-xs text-muted-foreground font-sans">
            Don't have an account?{" "}
            <Link href="/sign-up" className="font-semibold text-foreground hover:underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
