import { Link, useLocation } from "wouter"
import { FileText, ShieldAlert, LayoutDashboard, Eye, Menu, X, LogOut, UserRound, LogIn } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isGuest, logout } = useAuth()

  const handleSignOut = () => {
    logout()
  }
  const handleGuestSignOut = (setLoc: (to: string) => void) => {
    logout()
    setLoc("/sign-in")
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* ── Mobile top bar ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-medium tracking-tight">
          <ShieldAlert className="w-5 h-5" />
          Fine-Print Guardian
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* ── Mobile nav drawer ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="absolute top-[53px] left-0 right-0 bg-card border-b border-border shadow-lg px-4 py-3 flex flex-col gap-1"
            onClick={e => e.stopPropagation()}
          >
            <MobileNavItem href="/" current={location} onClick={() => setMobileOpen(false)}>
              <FileText className="w-4 h-4" /> New Analysis
            </MobileNavItem>
            <MobileNavItem href="/documents" current={location} onClick={() => setMobileOpen(false)}>
              <FileText className="w-4 h-4" /> Document Library
            </MobileNavItem>
            <MobileNavItem href="/watches" current={location} onClick={() => setMobileOpen(false)}>
              <Eye className="w-4 h-4" /> Watch List
            </MobileNavItem>
            <MobileNavItem href="/dashboard" current={location} onClick={() => setMobileOpen(false)}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </MobileNavItem>
            <div className="mt-2 pt-2 border-t border-border/50">
              <UserSection isGuest={isGuest} user={user} onSignOut={handleSignOut} onGuestSignOut={handleGuestSignOut} />
            </div>
          </nav>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 border-r border-border/50 flex-shrink-0 h-[100dvh] sticky top-0 bg-card p-6 flex-col gap-8">
        <div>
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-medium tracking-tight hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-6 h-6" />
            Fine-Print Guardian
          </Link>
          <p className="text-xs text-muted-foreground mt-2 font-sans">Quiet authority over contracts</p>
        </div>

        <nav className="flex flex-col gap-1 font-sans text-sm">
          <NavItem href="/" current={location}><FileText className="w-4 h-4" />New Analysis</NavItem>
          <NavItem href="/documents" current={location}><FileText className="w-4 h-4" />Document Library</NavItem>
          <NavItem href="/watches" current={location}><Eye className="w-4 h-4" />Watch List</NavItem>
          <NavItem href="/dashboard" current={location}><LayoutDashboard className="w-4 h-4" />Dashboard</NavItem>
        </nav>

        <div className="mt-auto pt-4 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground font-sans">Appearance</span>
            <ThemeToggle />
          </div>
          <UserSection isGuest={isGuest} user={user} onSignOut={handleSignOut} onGuestSignOut={handleGuestSignOut} />
        </div>
      </aside>

      {/* ── Page content ── */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}

function UserSection({ isGuest, user, onSignOut, onGuestSignOut }: {
  isGuest: boolean
  user: any
  onSignOut: () => void
  onGuestSignOut: (setLoc: (to: string) => void) => void
}) {
  const [, setLocation] = useLocation()

  if (isGuest) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-[hsl(0,43%,51%)]">
          <UserRound className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">Guest session</span>
          <span className="text-muted-foreground ml-auto text-[10px]">data is temporary</span>
        </div>
        <button
          onClick={() => setLocation("/sign-up")}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors w-full text-left"
        >
          <LogIn className="w-3.5 h-3.5 shrink-0" /> Save data — create account
        </button>
        <button
          onClick={() => onGuestSignOut(setLocation)}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-secondary/50 transition-colors w-full text-left"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" /> End guest session
        </button>
      </div>
    )
  }

  if (user) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <UserRound className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          <span className="truncate">{user.email ?? user.name ?? "User"}</span>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-secondary/50 transition-colors w-full text-left"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" /> Sign out
        </button>
      </div>
    )
  }

  return null
}

function NavItem({ href, current, children }: { href: string; current: string; children: React.ReactNode }) {
  const isActive = current === href || (href !== "/" && current.startsWith(href))
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        isActive ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      }`}
    >
      {children}
    </Link>
  )
}

function MobileNavItem({ href, current, children, onClick }: { href: string; current: string; children: React.ReactNode; onClick: () => void }) {
  const isActive = current === href || (href !== "/" && current.startsWith(href))
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm ${
        isActive ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      }`}
    >
      {children}
    </Link>
  )
}
