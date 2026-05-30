import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { customAlphabet } from "nanoid";
import { Link as LinkIcon, Copy, Check, Scissors, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scissor — Shorten URLs in seconds" },
      {
        name: "description",
        content: "Paste a long URL, get a short one instantly. Free, fast, and trustworthy URL shortener.",
      },
    ],
  }),
  component: Index,
});

const generateSlug = customAlphabet(
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  6
);

const RESERVED_SLUGS = ["api", "dashboard", "admin", "login", "register", "r"];

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidCustomSlug(slug: string) {
  return /^[a-zA-Z0-9-]{3,50}$/.test(slug);
}

function Index() {
  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  useEffect(() => {
    if (!customSlug) {
      setSlugAvailable(null);
      return;
    }
    if (!isValidCustomSlug(customSlug)) {
      setSlugAvailable(null);
      return;
    }
    if (RESERVED_SLUGS.includes(customSlug.toLowerCase())) {
      setSlugAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      const { data } = await supabase
        .from("links")
        .select("id")
        .eq("slug", customSlug)
        .maybeSingle();
      setSlugAvailable(!data);
      setCheckingSlug(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [customSlug]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = longUrl.trim();

    if (!isValidUrl(url)) {
      toast.error("Please enter a valid URL (must start with http:// or https://)");
      return;
    }

    if (customSlug && !isValidCustomSlug(customSlug)) {
      toast.error("Custom slug must be 3–50 characters, letters, numbers, and hyphens only.");
      return;
    }

    if (customSlug && slugAvailable === false) {
      toast.error("That custom slug is already taken. Please choose another.");
      return;
    }

    setLoading(true);
    setShortUrl(null);
const slug = customSlug || generateSlug();
    const { data: { session } } = await supabase.auth.getSession();

    // Rate limit anonymous users to 5 links per day
    if (!session) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("links")
        .select("*", { count: "exact", head: true })
        .is("user_id", null)
        .gte("created_at", today.toISOString());

      if ((count ?? 0) >= 5) {
        toast.error("Daily limit reached. Sign in to create unlimited links.");
        setLoading(false);
        return;
      }
    }

    const insertData: any = {
      slug,
      original_url: url,
      custom_slug: !!customSlug,
      user_id: session?.user?.id ?? null,
    };

    if (expiresAt) {
      insertData.expires_at = new Date(expiresAt).toISOString();
    }

    const { error } = await supabase.from("links").insert(insertData);

    if (error) {
      if (error.code === "23505") {
        toast.error("That slug is already taken. Please choose another.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      setLoading(false);
      return;
    }

    setShortUrl(`${window.location.origin}/r/${slug}`);
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Scissor</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </a>
            <a href="/dashboard"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Short links, big impact
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Paste a long URL and get a clean, shareable short link in under a second.
          </p>
        </div>

        <form onSubmit={handleShorten} className="mt-10 flex flex-col gap-3">
          <div className="relative flex-1">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://your-very-long-url.com/path"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              className="h-12 pl-9"
              required
            />
          </div>

          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              /r/
            </span>
            <Input
              type="text"
              placeholder="custom-slug (optional)"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value.toLowerCase())}
              className="h-12 pl-9"
            />
            {customSlug && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
                {checkingSlug ? (
                  <span className="text-muted-foreground">Checking...</span>
                ) : slugAvailable === true ? (
                  <span className="text-green-600">✓ Available</span>
                ) : slugAvailable === false ? (
                  <span className="text-red-500">✗ Taken</span>
                ) : null}
              </span>
            )}
          </div>

          <div className="relative flex-1">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="datetime-local"
              placeholder="Expiry date (optional)"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-12 pl-9"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <Button type="submit" disabled={loading} className="h-12 px-6">
            {loading ? "Shortening…" : "Shorten"}
          </Button>
        </form>

        {shortUrl && (
          <div className="mt-8 rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Your short link
            </p>
            <div className="mt-2 flex items-center gap-3">
              <a href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-lg font-medium text-primary hover:underline"
              >
                {shortUrl}
              </a>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copy short link"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}