import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Scissors, Copy, Trash2, LogOut, ExternalLink, QrCode, X, BarChart2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type Link = {
  id: string;
  slug: string;
  original_url: string;
  click_count: number;
  created_at: string;
  expires_at: string | null;
  is_expired: boolean;
};

function QRModal({ url, slug, onClose }: { url: string; slug: string; onClose: () => void }) {
  const handleDownload = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `scissor-${slug}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadPNG = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `scissor-${slug}.png`;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">QR Code</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4 truncate">{url}</p>
        <div className="flex justify-center mb-6">
          <QRCodeSVG
            id="qr-code-svg"
            value={url}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleDownload}>
            Download SVG
          </Button>
          <Button className="flex-1" onClick={handleDownloadPNG}>
            Download PNG
          </Button>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [qrLink, setQrLink] = useState<Link | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      setUser(session.user);
      fetchLinks(session.user.id);
    });
  }, [navigate]);

  const fetchLinks = async (userId: string) => {
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load links");
    } else {
      setLinks(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete link");
    } else {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success("Link deleted");
    }
  };

  const handleCopy = async (slug: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${slug}`);
    toast.success("Copied to clipboard!");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {qrLink && (
        <QRModal
          url={`${window.location.origin}/r/${qrLink.slug}`}
          slug={qrLink.slug}
          onClose={() => setQrLink(null)}
        />
      )}

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Scissor</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Links</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {links.length} link{links.length !== 1 ? "s" : ""} created
            </p>
          </div>
          
          <a  href="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + New link
          </a>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            Loading your links...
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">
              You haven't created any links yet.
            </p>
            
            <a href="/"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create your first link
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Short link</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Original URL</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clicks</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      
                      <a href={`/r/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium flex items-center gap-1"
                      >
                        /r/{link.slug}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="truncate block text-muted-foreground" title={link.original_url}>
                        {link.original_url}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{link.click_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(link.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {link.is_expired ? (
                        <span className="text-red-500 font-medium">Expired</span>
                      ) : link.expires_at ? (
                        formatDate(link.expires_at)
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(link.slug)}
                          title="Copy short link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate({ to: "/analytics/$linkId", params: { linkId: link.id } })}
                          title="View analytics"
                        >
                          <BarChart2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setQrLink(link)}
                          title="Generate QR code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(link.id)}
                          title="Delete link"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}