"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useScormStore } from "@/store/scormStore";
import { SCORMPackageCard } from "@/components/scorm/SCORMPackageCard";
import { SCORMExportModal } from "@/components/scorm/SCORMExportModal";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";

export default function SCORMPage() {
  const params = useParams();
  const videoId = parseInt(params.id as string, 10);
  const { packages, setPackages, addPackage, removePackage } = useScormStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const videoPackages = packages[videoId] || [];

  useEffect(() => {
    if (!videoId) return;
    
    // Using a mock fetch if no endpoint exists for listing all SCORM packages for a video
    // In our backend, there's no endpoint for `GET /api/v1/videos/{id}/scorm` yet, 
    // only POST for export and GET for a single package.
    // For now we assume one doesn't exist or we leave it empty until implemented
  }, [videoId, setPackages]);

  const handleExport = async (version: string) => {
    try {
      const res = await api.post(`/videos/${videoId}/scorm`, {
        package_version: version
      });
      addPackage(videoId, res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/scorm/${id}`);
      removePackage(videoId, id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await api.get(`/scorm/${id}/download`);
      if (res.data && res.data.download_url) {
        window.open(res.data.download_url, "_blank");
      } else {
        alert("Package not ready for download.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">SCORM Export</h1>
          <p className="text-muted-foreground mt-2">
            Export your videos and quizzes as SCORM packages for your LMS.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ Export New</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videoPackages.map((pkg: any) => (
          <SCORMPackageCard 
            key={pkg.id} 
            pkg={pkg}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        ))}
      </div>

      {videoPackages.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-surface-border rounded-lg text-slate-400">
          No SCORM packages generated yet. Click 'Export New' to generate one.
        </div>
      )}

      {isModalOpen && (
        <SCORMExportModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
