import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { ShieldAlert, ChevronRight, UserRound, KeySquare, Home, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { loginAsGuest } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/20">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-xl font-medium tracking-tight">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Fine-Print Guardian
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button onClick={() => setLocation("/sign-up")} size="sm" className="hidden sm:flex">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={staggerChildren} className="space-y-6">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border text-xs font-medium text-muted-foreground mb-4">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                AI-Powered Contract Analysis
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-7xl font-serif tracking-tight text-primary leading-[1.1]">
                Before you sign.
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload any contract. Get a clause-by-clause risk breakdown and flag exactly what you need to worry about—before you commit.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8" onClick={() => setLocation("/sign-up")}>
                  Start Free Analysis
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 bg-transparent" onClick={() => { loginAsGuest(); setLocation("/"); }}>
                  <UserRound className="w-4 h-4 mr-2" />
                  Try as Guest
                </Button>
              </motion.div>
              <motion.p variants={fadeUp} className="text-xs text-muted-foreground mt-4">
                No credit card required. Guest data disappears when you close the tab.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Document Types */}
        <section className="py-24 bg-card border-y border-border/50 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4">Analyze any agreement</h2>
              <p className="text-muted-foreground">We recognize specialized clauses across multiple document domains.</p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerChildren} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Subscription Agreements", desc: "Identify hidden auto-renewals, unexpected price hikes, and restrictive cancellation policies before you subscribe.", icon: <Zap className="w-6 h-6" /> },
                { title: "Lease Contracts", desc: "Uncover unfair maintenance burdens, arbitrary eviction clauses, and deposit withholding terms.", icon: <Home className="w-6 h-6" /> },
                { title: "Terms of Service", desc: "Understand exactly what data you are surrendering and what rights you waive when you click 'Agree'.", icon: <KeySquare className="w-6 h-6" /> }
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="p-8 rounded-2xl bg-background border border-border shadow-sm hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-serif mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerChildren} className="space-y-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4">Clarity in three steps</h2>
                  <p className="text-muted-foreground">The fine print is deliberately opaque. We make it transparent.</p>
                </div>
                
                {[
                  { step: "01", title: "Upload your document", desc: "Paste text or upload PDF, Word, and text files directly into our secure scanner." },
                  { step: "02", title: "Instant clause breakdown", desc: "Our engine dissects the contract, categorizing clauses by intent and evaluating their risk." },
                  { step: "03", title: "Review red flags", desc: "Focus your attention on highlighted risks, with plain-english explanations and negotiation advice." }
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-serif text-sm text-foreground">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-medium mb-1">{item.title}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="relative aspect-square md:aspect-auto md:h-[600px] rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex items-center justify-center p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-background to-secondary/20" />
                <div className="relative w-full max-w-sm space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-3 items-start p-4 rounded-lg bg-background border border-border shadow-sm">
                      <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${i === 2 ? 'bg-destructive' : i === 4 ? 'bg-[#C8773A]' : 'bg-[#3A7A52]'}`} />
                      <div className="space-y-2 w-full">
                        <div className="h-2 bg-muted rounded w-full" />
                        <div className={`h-2 bg-muted rounded ${i % 2 === 0 ? 'w-4/5' : 'w-5/6'}`} />
                        {i === 2 && <div className="mt-3 text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded border border-destructive/20">Identified liability waiver risk</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-serif">Protect your interests.</h2>
            <p className="text-primary-foreground/80 text-lg">
              Never sign a contract you haven't fully understood. Let Fine-Print Guardian highlight what matters.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base h-14 px-8 text-primary hover:bg-secondary/90" onClick={() => setLocation("/sign-up")}>
                Create Free Account
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => { loginAsGuest(); setLocation("/"); }}>
                Continue as Guest
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} Fine-Print Guardian. Quiet authority over contracts.</p>
      </footer>
    </div>
  );
}
