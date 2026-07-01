import React from "react";
import { ImportJob } from "@/store/importStore";

export function ImportProgress({ job }: { job: ImportJob }) {
  const getStatusColor = () => {
    switch (job.status) {
      case "completed": return "text-green-500";
      case "failed": return "text-red-500";
      case "processing": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 shadow-sm bg-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{job.file_name}</h3>
          <p className="text-sm text-muted-foreground">Type: {job.file_type}</p>
        </div>
        <div className={`font-medium capitalize ${getStatusColor()}`}>
          {job.status}
        </div>
      </div>
      
      {job.status === "processing" && (
        <div className="space-y-2">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse w-full"></div>
          </div>
          <p className="text-sm text-muted-foreground text-right">Parsing document...</p>
        </div>
      )}

      {job.status === "failed" && job.error_message && (
        <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
          {job.error_message}
        </div>
      )}
    </div>
  );
}
