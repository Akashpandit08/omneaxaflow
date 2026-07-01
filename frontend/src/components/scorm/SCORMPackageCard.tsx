import React from "react";
import { SCORMPackage } from "@/store/scormStore";
import { Button } from "@/components/ui/Button";

interface SCORMPackageCardProps {
  pkg: SCORMPackage;
  onDelete: (id: number) => void;
  onDownload: (id: number) => void;
}

export function SCORMPackageCard({ pkg, onDelete, onDownload }: SCORMPackageCardProps) {
  const getStatusColor = () => {
    switch (pkg.status) {
      case "ready": return "text-green-500 bg-green-50";
      case "failed": return "text-red-500 bg-red-50";
      case "processing": return "text-blue-500 bg-blue-50";
      default: return "text-gray-500 bg-gray-50";
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{pkg.package_version}</h3>
          <p className="text-sm text-muted-foreground">Generated: {new Date(pkg.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${getStatusColor()}`}>
          {pkg.status}
        </span>
      </div>

      {pkg.status === "processing" && (
        <div className="space-y-2">
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse w-full"></div>
          </div>
          <p className="text-xs text-muted-foreground text-right">Building package...</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={pkg.status !== "ready"}
          onClick={() => onDownload(pkg.id)}
        >
          Download ZIP
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(pkg.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
