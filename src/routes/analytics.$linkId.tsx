import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie,
  Cell, BarChart, Bar, Legend,
} from "recharts";

export const Route = createFileRoute("/analytics/$linkId")({
  component: AnalyticsPage,
});

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function AnalyticsPage() {
  const { linkId } = Route.useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState<any>(null);
  const [clicks, setClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate({ to: "/login" }); return; }
      fetchData(linkId);
    });
  }, [linkId, navigate]);

  const fetchData = async (id: string) => {
    const { data: linkData } = await supabase
      .from("links")
      .select("*")
      .eq("id", id)
      .single();
    setLink(linkData);

    const { data: clickData } = await supabase
      .from("clicks")
      .select("*")
      .eq("link_id", id)
      .order("clicked_at", { ascending: true });
    setClicks(clickData || []);
    setLoading(false);
  };

  // Clicks per day
  const clicksByDay = clicks.reduce((acc: any, click) => {
    const day = new Date(click.clicked_at).toLocaleDateString("en-GB", {
      day: "numeric", month: "short",
    });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const clicksChartData = Object.entries(clicksByDay).map(([date, count]) => ({
    date, clicks: count,
  }));

  // Device breakdown
  const deviceData = clicks.reduce((acc: any, click) => {
    const device = click.device_type || "unknown";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});

  const deviceChartData = Object.entries(deviceData).map(([name, value]) => ({
    name, value,
  }));

  // Top referrers
  const referrerData = clicks.reduce((acc: any, click) => {
    const ref = click.referrer || "direct";
    try {
      const hostname = new URL(ref).hostname;
      acc[hostname] = (acc[hostname] || 0) + 1;
    } catch {
      acc["direct"] = (acc["direct"] || 0) + 1;
    }
    return acc;
  }, {});

  const referrerChartData = Object.entries(referrerData)
    .map(([name, count]) => ({ name, clicks: count }))
    .sort((a: any, b: any) => b.clicks - a.clicks)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Scissor</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            /r/{link?.slug} → {link?.original_url}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total clicks</p>
            <p className="text-3xl font-bold mt-1">{clicks.length}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Devices tracked</p>
            <p className="text-3xl font-bold mt-1">{deviceChartData.length}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Unique referrers</p>
            <p className="text-3xl font-bold mt-1">{referrerChartData.length}</p>
          </div>
        </div>

        {clicks.length === 0 ? (
          <div className="text-center py-20 rounded-lg border border-border">
            <p className="text-muted-foreground">No clicks recorded yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Share your link to start seeing analytics.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Clicks over time */}
            <div className="rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4">Clicks over time</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={clicksChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Device breakdown */}
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Device breakdown</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={deviceChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {deviceChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top referrers */}
              <div className="rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Top referrers</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={referrerChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="clicks" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}