import { Link } from "wouter";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6 animate-in fade-in duration-700">
      <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-50" />
      <div className="space-y-2">
        <h1 className="text-4xl font-serif tracking-tight text-primary">Page not found</h1>
        <p className="text-muted-foreground font-sans max-w-md mx-auto text-lg">
          The document or page you are looking for does not exist or has been removed.
        </p>
      </div>
      <Link href="/">
        <Button size="lg" className="font-serif mt-4">
          Return to Home
        </Button>
      </Link>
    </div>
  );
}
