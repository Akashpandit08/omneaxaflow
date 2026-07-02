"use client";

import React, { useState } from "react";
import { FileUpload } from "@/components/import/FileUpload";
import { ImportProgress } from "@/components/import/ImportProgress";
import { ImportPreview } from "@/components/import/ImportPreview";
import { useImportStore } from "@/store/importStore";
import { useRouter } from "next/navigation";
import { processImportJob, uploadImportFile } from "@/lib/api";

export default function ImportsPage() {
  const router = useRouter();
  const { jobs, addJob, updateJob } = useImportStore();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const data = await uploadImportFile(file);
      addJob(data);

      const processData = await processImportJob(data.id);
      updateJob(processData.id, processData);

    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to upload file");
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
