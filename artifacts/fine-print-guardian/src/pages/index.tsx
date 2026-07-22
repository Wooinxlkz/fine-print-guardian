import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateDocument, useScanDocument } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, Upload, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { extractText } from "@/lib/extract-text";

const ACCEPTED = ".txt,.pdf,.docx,.doc,.md,.rtf,.csv";
const ACCEPTED_LABEL = "PDF, Word (.docx), plain text, and more";

// 200KB soft limit — keeps server costs down and analysis fast.
// The server also enforces this limit.
const MAX_TEXT_BYTES = 200_000;

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["subscription", "lease", "tos"]),
  rawText: z
    .string()
    .min(10, "Please paste or upload contract text (at least 10 characters).")
    .max(MAX_TEXT_BYTES, `Text is too large. Please keep contracts under ${Math.round(MAX_TEXT_BYTES / 1000)}KB.`),
});

export default function Home() {
  const [, setLocation] = useLocation();
  const createDocument = useCreateDocument();
  const scanDocument = useScanDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; pages?: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", category: "subscription", rawText: "" },
  });

  const checkSize = useCallback((text: string) => {
    if (text.length > MAX_TEXT_BYTES) {
      setSizeWarning(
        `This document is ${Math.round(text.length / 1000)}KB — over the 200KB limit. Please trim it down before analyzing.`
      );
    } else if (text.length > MAX_TEXT_BYTES * 0.8) {
      setSizeWarning(
        `Large document (${Math.round(text.length / 1000)}KB). Analysis may take a little longer.`
      );
    } else {
      setSizeWarning(null);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    setFileError(null);
    setSizeWarning(null);

    // Client-side file size pre-check (5MB raw file limit)
    if (file.size > 5 * 1024 * 1024) {
      setFileError("File is too large. Please use files under 5MB, or paste the text directly.");
      return;
    }

    setExtracting(true);
    try {
      const result = await extractText(file);
      if (!result.text.trim()) {
        setFileError("No readable text found in this file. Try copying and pasting the text manually.");
        return;
      }
      checkSize(result.text);
      form.setValue("rawText", result.text, { shouldValidate: true });
      setUploadedFile({ name: result.fileName, pages: result.pageCount });
      if (!form.getValues("title")) {
        const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        form.setValue("title", name, { shouldValidate: true });
      }
    } catch (err) {
      setFileError("Could not read this file. Try a different format or paste the text below.");
    } finally {
      setExtracting(false);
    }
  }, [form, checkSize]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const clearFile = () => {
    setUploadedFile(null);
    form.setValue("rawText", "", { shouldValidate: false });
    setFileError(null);
    setSizeWarning(null);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    createDocument.mutate(
      { data: values },
      {
        onSuccess: (doc) => {
          scanDocument.mutate({ id: doc.id });
          setLocation(`/documents/${doc.id}`);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? "Failed to create document. Please try again.";
          form.setError("rawText", { message: msg });
        },
      }
    );
  }

  const isPending = createDocument.isPending || extracting;

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-primary mb-2 sm:mb-3">
          Before you sign.
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg font-sans leading-relaxed">
          Upload or paste your contract. We'll read every clause and flag exactly what you need to worry about.
        </p>
      </div>

      <Card className="border-border/60 shadow-sm bg-card/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">New Analysis</CardTitle>
          <CardDescription>Title, category, then upload or paste your contract text.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acme Corp Lease Agreement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lease">Lease Agreement</SelectItem>
                          <SelectItem value="subscription">Subscription Agreement</SelectItem>
                          <SelectItem value="tos">Terms of Service</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Upload zone */}
              <div>
                <p className="text-sm font-medium mb-2 text-foreground/90">Contract Text</p>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => !uploadedFile && !extracting && fileInputRef.current?.click()}
                  className={`
                    relative flex flex-col items-center justify-center gap-2 min-h-[96px]
                    border-2 border-dashed rounded-lg p-5 text-center
                    transition-all duration-200
                    ${isDragging
                      ? "border-primary bg-primary/5 cursor-copy"
                      : uploadedFile
                        ? "border-[#3A7A52]/50 bg-[#3A7A52]/5 cursor-default"
                        : "border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer"
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED}
                    className="sr-only"
                    onChange={handleFileChange}
                  />

                  {extracting ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Extracting text…</span>
                    </div>
                  ) : uploadedFile ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#3A7A52] shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-[#3A7A52]">{uploadedFile.name}</p>
                        {uploadedFile.pages && (
                          <p className="text-xs text-muted-foreground">{uploadedFile.pages} page{uploadedFile.pages !== 1 ? "s" : ""} extracted</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); clearFile(); }}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Drop a file here or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{ACCEPTED_LABEL}</p>
                      </div>
                    </>
                  )}
                </div>

                {fileError && <p className="text-xs text-destructive mt-1.5">{fileError}</p>}

                {/* Size warning */}
                {sizeWarning && (
                  <div className="flex items-start gap-1.5 mt-1.5 text-xs text-[#C8773A]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{sizeWarning}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">or paste below</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <FormField
                  control={form.control}
                  name="rawText"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Paste the full text of the contract here…"
                          className="min-h-[180px] font-mono text-xs resize-y"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            checkSize(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-[10px] text-muted-foreground mt-1.5 font-sans">
                  Maximum 200KB of text. Larger contracts should be split into sections.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-serif"
                disabled={isPending || (sizeWarning?.includes("over the") ?? false)}
              >
                {isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{extracting ? "Extracting text…" : "Preparing document…"}</>
                ) : (
                  <><FileText className="mr-2 h-4 w-4" />Analyze Contract</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
