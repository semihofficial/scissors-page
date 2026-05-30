import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Scissors } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard" });
    });

    // Listen for login success
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) navigate({ to: "/dashboard" });
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-4">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-foreground">Scissor</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">Welcome to Scissor</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to manage your links and view analytics
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={["google"]}
              redirectTo={`${window.location.origin}/dashboard`}
              theme="light"
            />
          </div>
        </div>
      </main>
    </div>
  );
}