"use client";

import React, { useState } from "react";
import { FileUpload } from "@/components/import/FileUpload";
import { ImportProgress } from "@/components/import/ImportProgress";
import { ImportPreview } from "@/components/import/ImportPreview";
import { useImportStore } from "@/store/importStore";
import { useRouter } from "next/navigation";

export default function ImportsPage() {
  const router = useRouter();
  const { jobs, addJob, updateJob } = useImportStore();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Mock API call to upload
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/v1/imports/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      addJob(data);

      // Trigger process
      const processRes = await fetch(`/api/v1/imports/${data.id}/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const processData = await processRes.json();
      updateJob(processData.id, processData);

    } catch (err) {
      console.error(err);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const activeJob = jobs.length > 0 ? jobs[0] : null;

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Import Presentation</h1>
        <p className="text-muted-foreground mt-2">
          Upload a PowerPoint or PDF to automatically generate a video project with scenes.
        </p>
      </div>

      <FileUpload onUpload={handleUpload} isUploading={isUploading} />

      {activeJob && (
        <div className="space-y-6">
          <ImportProgress job={activeJob} />
          {activeJob.status === "completed" && activeJob.parsed_content && (
            <ImportPreview 
              job={activeJob} 
              onContinue={() => {
                if (activeJob.project_id) {
                  router.push(`/projects/${activeJob.project_id}`);
                }
              }} 
            />
          )}
        </div>
      )}

      {jobs.length > 1 && (
        <div className="pt-8 mt-8 border-t">
          <h2 className="text-xl font-semibold mb-4">Recent Imports</h2>
          <div className="space-y-4">
            {jobs.slice(1).map(job => (
              <ImportProgress key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
