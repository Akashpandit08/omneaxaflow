"use client";

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Loader2, Type, Bold, Italic, Wand2, RefreshCcw, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { AIGenerateModal } from './AIGenerateModal';

const TEMPLATES: Record<string, string> = {
  "Explainer Video": "<h3>Explainer Video</h3><p><strong>Hook:</strong> Are you tired of [Problem]?</p><p><strong>Intro:</strong> Meet [Product], the solution to your problems.</p><p><strong>Body:</strong> Here's how it works...</p><p><strong>CTA:</strong> Get started today!</p>",
  "TikTok Ad": "<h3>TikTok Ad</h3><p><strong>Hook:</strong> Stop scrolling! You need to see this.</p><p><strong>Body:</strong> I just found the best hack for...</p><p><strong>CTA:</strong> Link in bio to get yours.</p>",
  "Tutorial": "<h3>Tutorial</h3><p><strong>Intro:</strong> Welcome back to my channel! Today we're learning...</p><p><strong>Step 1:</strong> First, you need to...</p><p><strong>Step 2:</strong> Next, we will...</p><p><strong>Outro:</strong> Thanks for watching!</p>"
};

interface ScriptEditorProps {
  value: string;
  onChange: (val: string) => void;
  onAutoSave?: () => void;
}

export function ScriptEditor({ value, onChange, onAutoSave }: ScriptEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Error">("Saved");
  const [charCount, setCharCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "<p>Start writing your script here...</p>",
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] p-6 text-gray-200',
      },
    },
    onUpdate: ({ editor }) => {
      setCharCount(editor.getText().length);
      onChange(editor.getHTML());
      debouncedSave();
    },
  });

  useEffect(() => {
    if (editor) {
      setCharCount(editor.getText().length);
    }
  }, [editor]);

  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      if (!editor.isFocused) {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor]);

  const debouncedSave = useDebouncedCallback(() => {
    if (onAutoSave) {
      setSaveStatus("Saving...");
      try {
        onAutoSave();
        setTimeout(() => setSaveStatus("Saved"), 500);
      } catch (err) {
        setSaveStatus("Error");
      }
    }
  }, 1000);

  const applyTemplate = (templateName: string) => {
    if (editor && TEMPLATES[templateName]) {
      editor.commands.setContent(TEMPLATES[templateName]);
      onChange(editor.getHTML());
      debouncedSave();
    }
  };

  const handleCopy = () => {
    if (editor) {
      navigator.clipboard.writeText(editor.getText());
      toast.success("Script copied to clipboard!");
    }
  };

  const handleGenerate = async (data: { topic: string; tone: string; length: string; targetAudience: string }) => {
    try {
      const res = await api.post("/ai/generate", data);
      if (res.data.success && editor) {
        editor.commands.setContent(res.data.script);
        onChange(editor.getHTML());
        debouncedSave();
        toast.success("Script generated!");
      } else {
        toast.error(res.data.message || "Failed to generate script");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "An error occurred");
    }
  };

  const handleRewrite = async (tone: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text) {
      toast.error("Select some text to rewrite");
      return;
    }

    const loadingToast = toast.loading("Rewriting...");
    try {
      const res = await api.post("/ai/rewrite", { script: text, tone });
      if (res.data.success) {
        editor.chain().focus().insertContentAt({ from, to }, res.data.script).run();
        onChange(editor.getHTML());
        debouncedSave();
        toast.success("Rewritten successfully", { id: loadingToast });
      } else {
        toast.error(res.data.message || "Failed to rewrite", { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "An error occurred", { id: loadingToast });
    }
  };

  const handleTranslate = async (lang: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text) {
      toast.error("Select some text to translate");
      return;
    }

    const loadingToast = toast.loading(`Translating to ${lang}...`);
    try {
      const res = await api.post("/ai/translate", { script: text, language: lang });
      if (res.data.success) {
        editor.chain().focus().insertContentAt({ from, to }, res.data.script).run();
        onChange(editor.getHTML());
        debouncedSave();
        toast.success("Translated successfully", { id: loadingToast });
      } else {
        toast.error(res.data.message || "Failed to translate", { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "An error occurred", { id: loadingToast });
    }
  };

  if (!editor) return null;

  return (
    <>
      <div className="flex flex-col h-full bg-[#121212] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-white/10'}`}
              title="Bold"
            >
              <Bold size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-white/10'}`}
              title="Italic"
            >
              <Italic size={18} />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg transition-colors text-gray-400 hover:bg-white/10"
              title="Copy Script"
            >
              <Copy size={18} />
            </button>
            <div className="w-px h-6 bg-white/10 mx-2" />
            
            <select 
              className="bg-transparent border border-white/10 text-sm rounded-lg px-3 py-2 text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
              onChange={(e) => {
                if (e.target.value) {
                  applyTemplate(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="">Templates...</option>
              {Object.keys(TEMPLATES).map(t => (
                <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className={`text-sm ${saveStatus === 'Error' ? 'text-red-400' : 'text-gray-400'}`}>
              {saveStatus}
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              <Wand2 size={16} />
              Generate Script
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden items-center">
              <RefreshCcw size={14} className="text-gray-400 ml-3 mr-1" />
              <select 
                className="bg-transparent text-sm px-2 py-2 text-gray-300 hover:bg-white/5 transition-colors focus:outline-none border-r border-white/10"
                onChange={(e) => {
                  if (e.target.value) {
                    handleRewrite(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="" className="bg-[#1a1a1a]">Rewrite (Tone)...</option>
                <option value="professional" className="bg-[#1a1a1a]">Professional</option>
                <option value="friendly" className="bg-[#1a1a1a]">Friendly</option>
                <option value="casual" className="bg-[#1a1a1a]">Casual</option>
                <option value="sales" className="bg-[#1a1a1a]">Sales</option>
              </select>

              <select 
                className="bg-transparent text-sm px-3 py-2 text-gray-300 hover:bg-white/5 transition-colors focus:outline-none"
                onChange={(e) => {
                  if (e.target.value) {
                    handleTranslate(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="" className="bg-[#1a1a1a]">Translate to...</option>
                <option value="spanish" className="bg-[#1a1a1a]">Spanish</option>
                <option value="french" className="bg-[#1a1a1a]">French</option>
                <option value="german" className="bg-[#1a1a1a]">German</option>
              </select>
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
        </div>

        <div className="p-3 bg-black/20 border-t border-white/10 flex justify-end text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Type size={12} /> {charCount} characters
          </span>
        </div>
      </div>

      <AIGenerateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerate}
      />
    </>
  );
}
