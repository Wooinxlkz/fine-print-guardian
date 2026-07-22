import {
  useListWatches,
  useCreateWatch,
  useDeleteWatch,
  useListDocuments,
  useCheckWatch,
  getListWatchesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, Clock, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchList() {
  const { data: watches, isLoading: watchesLoading } = useListWatches();
  const { data: documents } = useListDocuments();
  const createWatch = useCreateWatch();
  const deleteWatch = useDeleteWatch();
  const checkWatch = useCheckWatch();
  const queryClient = useQueryClient();
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [checkingId, setCheckingId] = useState<number | null>(null);

  const handleAddWatch = () => {
    if (!selectedDocId) return;
    createWatch.mutate(
      { data: { documentId: Number(selectedDocId) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWatchesQueryKey() });
          setSelectedDocId("");
        },
      }
    );
  };

  const handleRemoveWatch = (id: number) => {
    deleteWatch.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWatchesQueryKey() }) }
    );
  };

  const handleCheckNow = (id: number) => {
    setCheckingId(id);
    checkWatch.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWatchesQueryKey() });
          setCheckingId(null);
        },
        onError: () => setCheckingId(null),
      }
    );
  };

  const availableDocs = documents?.filter((d) => !watches?.some((w) => w.documentId === d.id)) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-primary mb-1 sm:mb-2">Watch List</h1>
        <p className="text-muted-foreground font-sans text-sm sm:text-base">
          Monitor documents for clause changes over time.
        </p>
      </div>

      {/* Add card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Add to Watch List</CardTitle>
          <CardDescription>Select an existing analyzed document to monitor.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedDocId} onValueChange={setSelectedDocId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a document…" />
            </SelectTrigger>
            <SelectContent>
              {availableDocs.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">No available documents</div>
              ) : (
                availableDocs.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id.toString()}>
                    {doc.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddWatch}
            disabled={!selectedDocId || createWatch.isPending}
            className="w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Watch
          </Button>
        </CardContent>
      </Card>

      {/* Active watches */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="font-serif text-lg sm:text-xl font-medium text-primary">Active Watches</h3>

        {watchesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : watches?.length === 0 ? (
          <div className="text-center py-10 sm:py-12 border border-dashed rounded-lg bg-card/50">
            <Eye className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-base sm:text-lg font-serif">You aren't watching any documents.</p>
            <p className="text-sm text-muted-foreground mt-1 px-4">Add a document above to track changes over time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {watches?.map((watch) => {
              const isChecking = checkingId === watch.id;
              return (
                <Card key={watch.id} className="p-4 bg-card hover:bg-muted/20 transition-colors">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-base sm:text-lg leading-snug truncate">
                          {watch.documentTitle}
                        </h4>
                        {watch.active ? (
                          <Badge variant="outline" className="border-[#3A7A52] text-[#3A7A52] bg-[#3A7A52]/10 text-[10px] uppercase shrink-0">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] uppercase shrink-0">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        Watching since {format(new Date(watch.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCheckNow(watch.id)}
                        disabled={isChecking}
                        className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2"
                        title="Check for changes now"
                      >
                        {isChecking ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Check now</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveWatch(watch.id)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        title="Stop watching"
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Status row — shows real diff result */}
                  <div className={`mt-3 flex items-start gap-1.5 text-xs sm:text-sm px-3 py-2 rounded-md border w-full ${
                    watch.changesDetected === true
                      ? "bg-[#C8773A]/8 border-[#C8773A]/30 text-[#C8773A]"
                      : watch.changesDetected === false
                        ? "bg-[#3A7A52]/8 border-[#3A7A52]/20 text-[#3A7A52]"
                        : "bg-secondary border-border/50 text-muted-foreground"
                  }`}>
                    {watch.changesDetected === true ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : watch.changesDetected === false ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
                    )}
                    <div>
                      <span>{watch.changeSummary ?? "Click \"Check now\" to establish a baseline and start tracking changes."}</span>
                      {watch.lastCheckedAt && (
                        <span className="block text-[10px] opacity-70 mt-0.5">
                          Last checked {format(new Date(watch.lastCheckedAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
