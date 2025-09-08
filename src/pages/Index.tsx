import { AuthForm } from "@/components/AuthForm";
import { Dashboard } from "@/components/Dashboard";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <div className="w-6 h-6 bg-primary rounded-full"></div>
          </div>
          <p className="text-foreground">Loading PII Redaction System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return <Dashboard />;
}