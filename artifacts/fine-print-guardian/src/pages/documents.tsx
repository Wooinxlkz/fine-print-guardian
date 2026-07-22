import { useListDocuments, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileText, Trash2, ArrowRight, ShieldAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function DocumentLibrary() {
  const { data: documents, isLoading } = useListDocuments();
  const deleteDocument = useDeleteDocument();
  const queryClient = useQueryClient();

  const getScoreBadge = (score: string | null | undefined) => {
    switch (score) {
      case "safe": return <Badge variant="safe">Safe</Badge>;
      case "caution": return <Badge variant="caution">Caution</Badge>;
      case "red_flag": return <Badge variant="red_flag">Red Flags</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault(); // Prevent link click
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocument.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        }
      });
    }
  };

  const displayCategory = (cat: string) => {
    if (cat === "tos") return "Terms of Service";
    if (cat === "subscription") return "Subscription";
    if (cat === "lease") return "Lease";
    return cat;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-primary mb-2">Document Library</h1>
          <p className="text-muted-foreground font-sans">All previously analyzed contracts and agreements.</p>
        </div>
        <Link href="/">
          <Button className="font-serif">New Analysis</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents?.length === 0 ? (
        <Card className="text-center py-16 bg-card/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-medium">No documents yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Upload your first contract to see what's hidden in the fine print.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                Start Analysis <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents?.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group h-full flex flex-col">
                <CardHeader className="pb-3 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 pr-4">
                      <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                        {doc.title}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(doc.uploadedAt), "MMM d, yyyy")} • <span>{displayCategory(doc.category)}</span>
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity -mt-2 -mr-2"
                      onClick={(e) => handleDelete(e, doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getScoreBadge(doc.overallScore)}
                      {doc.status === 'analyzing' && <Badge variant="secondary" className="animate-pulse">Analyzing...</Badge>}
                    </div>
                    {doc.status === 'complete' && (
                      <div className="flex text-xs text-muted-foreground gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#B84C4C]" /> {doc.redFlagCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#C8773A]" /> {doc.cautionCount}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
