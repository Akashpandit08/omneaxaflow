"use client";

import React, { useState, useEffect } from "react";
import { useScormStore } from "@/store/scormStore";
import { SCORMPackageCard } from "@/components/scorm/SCORMPackageCard";
import { SCORMExportModal } from "@/components/scorm/SCORMExportModal";
import { Button } from "@/components/ui/Button";

export default function SCORMPage() {
  const { packages, setPackages, addPackage, removePackage } = useScormStore();
  const [videoId, setVideoId] = useState(1); // Hardcoded for dashboard view
  const [isModalOpen, setIsModalOpen] = useState(false);

  const videoPackages = packages[videoId] || [];

  useEffect(() => {
    // In a real app, we might want a global endpoint to fetch all scorm packages, 
    // but the backend only has /api/v1/scorm/{id} (single) and POST to create. 
    // Wait, the prompt says endpoints are POST /api/v1/videos/{id}/scorm, GET /api/v1/scorm/{id}. 
    // We didn't define a list endpoint. I'll mock the fetch for now to prevent errors or just show empty.
  }, [videoId, setPackages]);

  const handleExport = async (version: string) => {
    try {
      const res = await fetch(`/api/v1/videos/${videoId}/scorm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          package_version: version
        })
      });
      if (res.ok) {
        const data = await res.json();
        addPackage(videoId, data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/scorm/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        removePackage(videoId, id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/scorm/${id}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.download_url) {
          window.open(data.download_url, "_blank");
        }
      } else {
        alert("Package not ready for download.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
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
        {videoPackages.map(pkg => (
          <SCORMPackageCard 
            key={pkg.id} 
            pkg={pkg}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        ))}
      </div>

      {videoPackages.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
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
