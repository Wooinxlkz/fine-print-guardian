import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserRound, Loader2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { login, loginAsGuest } = useAuth();
  const authRegister = useAuthRegister();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    authRegister.mutate(
      { data: { name, email, password } },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          setLocation("/");
        },
        onError: (err: any) => {
          setError(err?.response?.data?.error || "An error occurred during sign up");
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
          <h1 className="font-serif text-xl font-medium text-foreground tracking-tight">Create your account</h1>
          <p className="text-muted-foreground text-sm font-sans mt-1">Start reading contracts before you sign them</p>
        </div>

        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Name <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <Input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="bg-secondary/30"
              />
            </div>
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
                minLength={8}
                className="bg-secondary/30"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Must be at least 8 characters.</p>
            </div>
            
            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" disabled={authRegister.isPending} className="w-full mt-2 font-medium">
              {authRegister.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Account
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
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-foreground hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
