import React, { useState, useEffect } from "react";
import { User, Mic, Wand2, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Avatar, Voice, Project } from "@/types";

export function QuickVideoCreator() {
  const router = useRouter();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);

  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<number | null>(null);
  const [script, setScript] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch avatars
    api.get<{ items: Avatar[] }>("/avatars").then(r => {
      setAvatars(r.data.items || []);
      if (r.data.items?.length > 0) setSelectedAvatar(r.data.items[0].id);
    }).catch(console.error);

    // Fetch voices
    api.get<{ items: Voice[] }>("/voices").then(r => {
      setVoices(r.data.items || []);
      if (r.data.items?.length > 0) setSelectedVoice(r.data.items[0].id);
    }).catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!script.trim()) return alert("Please enter a script.");
    setIsSubmitting(true);
    try {
      const res = await api.post<Project>("/projects", {
        title: "Quick Video " + new Date().toLocaleTimeString(),
        script: script,
        avatar_id: selectedAvatar,
        voice_id: selectedVoice,
      });
      router.push(`/projects/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-brand-900/40 via-surface to-surface-elevated border border-surface-border p-8 rounded-3xl shadow-2xl relative overflow-hidden my-8">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2 text-center tracking-tight">
                Say it with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">video</span>
            </h2>
            <p className="text-slate-400 mb-8 text-center text-lg">Your new all-in-one agent for video creation.</p>
            
            <div className="w-full max-w-2xl bg-surface-elevated/80 backdrop-blur-xl border border-surface-border rounded-3xl p-2 shadow-inner transition-all focus-within:border-brand-500/50 focus-within:ring-4 focus-within:ring-brand-500/10">
                
                <div className="flex flex-wrap items-center gap-2 p-2 mb-2 border-b border-surface-border/50">
                    <div className="relative flex-shrink-0 group">
                        <select 
                            value={selectedAvatar || ""} 
                            onChange={e => setSelectedAvatar(Number(e.target.value))}
                            className="appearance-none bg-surface border border-surface-border hover:border-brand-500/50 rounded-full py-1.5 pl-9 pr-8 text-sm font-medium text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        >
                            <option value="" disabled>Select Avatar</option>
                            {avatars.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 pointer-events-none" />
                    </div>

                    <div className="relative flex-shrink-0 group">
                        <select 
                            value={selectedVoice || ""} 
                            onChange={e => setSelectedVoice(Number(e.target.value))}
                            className="appearance-none bg-surface border border-surface-border hover:border-cyan-500/50 rounded-full py-1.5 pl-9 pr-8 text-sm font-medium text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                            <option value="" disabled>Select Voice</option>
                            {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <Mic className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
                    </div>
                </div>
                
                <textarea 
                    className="w-full bg-transparent border-none p-4 text-lg text-white placeholder-slate-500 focus:outline-none resize-none min-h-[100px]"
                    placeholder="Ask for a video, an avatar, or anything in between—I can get you started."
                    value={script}
                    onChange={e => setScript(e.target.value)}
                />
                
                <div className="flex items-center justify-between p-2">
                    <div className="flex gap-2 text-slate-400">
                        <button className="p-2 hover:bg-surface rounded-full transition-colors"><Plus className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-surface rounded-full transition-colors"><Wand2 className="w-5 h-5" /></button>
                    </div>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !script.trim()} 
                        className="rounded-full px-6 py-2 bg-white text-black hover:bg-slate-200 shadow-lg transition-all font-semibold"
                    >
                        {isSubmitting ? "Processing..." : "Submit"}
                        {!isSubmitting && <Send className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-8">
                {["Course Lesson", "Use Avatar V", "Use Brand System", "Upload Docs", "Script to Video"].map(label => (
                    <button key={label} className="px-5 py-2 bg-surface/50 hover:bg-surface-elevated rounded-full border border-surface-border text-sm font-medium text-slate-300 backdrop-blur transition-colors">
                        {label}
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
}
