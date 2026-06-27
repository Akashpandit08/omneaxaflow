import { PageLoader } from "@/components/ui/Loader";

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <PageLoader message="Loading…" />
    </div>
  );
}
