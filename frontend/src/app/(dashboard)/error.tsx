"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-slate-400 text-sm mb-1 max-w-sm">
        An error occurred while loading this page.
      </p>
      {error.message && (
        <p className="text-xs text-red-400/80 font-mono bg-red-900/10 px-3 py-1.5 rounded-lg mb-6 max-w-sm">
          {error.message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={reset}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try again
        </Button>
        <Link href="/dashboard" className="btn-secondary btn-sm flex items-center gap-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
