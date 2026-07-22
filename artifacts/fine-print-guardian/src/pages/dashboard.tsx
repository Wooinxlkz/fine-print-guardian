import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, FileText, AlertTriangle, Eye, CheckCircle2, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading || !data) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        <div>
          <Skeleton className="h-8 sm:h-10 w-36 sm:w-48 mb-2" />
          <Skeleton className="h-4 w-48 sm:w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          <Skeleton className="h-24 sm:h-32 w-full" />
          <Skeleton className="h-24 sm:h-32 w-full" />
          <Skeleton className="h-24 sm:h-32 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Skeleton className="h-72 sm:h-96 lg:col-span-2 w-full" />
          <Skeleton className="h-72 sm:h-96 w-full" />
        </div>
      </div>
    );
  }

  const { totalDocuments, activeWatches, riskDistribution, categoryBreakdown, recentDocuments } = data;
  const total = Math.max(1, riskDistribution.red_flag + riskDistribution.caution + riskDistribution.safe);

  const displayCategory = (cat: string) => {
    if (cat === "tos") return "Terms of Service";
    if (cat === "subscription") return "Subscription";
    if (cat === "lease") return "Lease";
    return cat;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-primary mb-1 sm:mb-2">Overview</h1>
        <p className="text-muted-foreground font-sans text-sm sm:text-base">A summary of your document landscape.</p>
      </div>

      {/* Stat cards — 3 columns from sm up */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <Card className="bg-card border-border/60 shadow-sm">
          <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-primary/5 rounded-lg text-primary shrink-0">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Analyzed Documents</p>
              <p className="text-2xl sm:text-3xl font-serif">{totalDocuments}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60 shadow-sm">
          <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#B84C4C]/10 rounded-lg text-[#B84C4C] shrink-0">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Total Red Flags</p>
              <p className="text-2xl sm:text-3xl font-serif text-[#B84C4C]">{riskDistribution.red_flag}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60 shadow-sm">
          <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-secondary rounded-lg text-foreground shrink-0">
              <Eye className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Active Watches</p>
              <p className="text-2xl sm:text-3xl font-serif">{activeWatches}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Recent documents */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base sm:text-lg">Recent Documents</CardTitle>
            <CardDescription>The latest agreements you've uploaded.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No documents analyzed yet.
              </div>
            ) : (
              <div className="space-y-1">
                {recentDocuments.slice(0, 5).map((doc) => (
                  <Link key={doc.id} href={`/documents/${doc.id}`}>
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer border border-transparent hover:border-border/50 gap-3 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm text-foreground truncate">{doc.title}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{displayCategory(doc.category)}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {doc.overallScore === "safe" && <Badge variant="safe" className="text-[9px] sm:text-[10px]">Safe</Badge>}
                        {doc.overallScore === "caution" && <Badge variant="caution" className="text-[9px] sm:text-[10px]">Caution</Badge>}
                        {doc.overallScore === "red_flag" && <Badge variant="red_flag" className="text-[9px] sm:text-[10px] whitespace-nowrap">Red Flags</Badge>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk breakdown */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base sm:text-lg">Risk Breakdown</CardTitle>
            <CardDescription>Clause severity across all docs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center text-[#B84C4C] font-medium gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Red Flag
                </span>
                <span className="font-medium">{riskDistribution.red_flag}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[#B84C4C] rounded-full transition-all" style={{ width: `${(riskDistribution.red_flag / total) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center text-[#C8773A] font-medium gap-1">
                  <Info className="w-3.5 h-3.5" /> Caution
                </span>
                <span className="font-medium">{riskDistribution.caution}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[#C8773A] rounded-full transition-all" style={{ width: `${(riskDistribution.caution / total) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center text-[#3A7A52] font-medium gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Safe
                </span>
                <span className="font-medium">{riskDistribution.safe}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[#3A7A52] rounded-full transition-all" style={{ width: `${(riskDistribution.safe / total) * 100}%` }} />
              </div>
            </div>

            <div className="pt-4 sm:pt-6 border-t border-border space-y-2">
              <h4 className="text-sm font-medium">Categories</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Leases</span>
                <span className="font-medium">{categoryBreakdown.lease}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subscriptions</span>
                <span className="font-medium">{categoryBreakdown.subscription}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Terms of Service</span>
                <span className="font-medium">{categoryBreakdown.tos}</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
