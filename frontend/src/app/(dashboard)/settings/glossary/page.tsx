"use client";

import React, { useEffect, useState } from "react";
import { useGlossaryStore } from "@/store/glossaryStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createGlossaryTerm, deleteGlossaryTerm, listGlossaryTerms } from "@/lib/api";

export default function GlossaryPage() {
  const { terms, setTerms, addTerm, removeTerm } = useGlossaryStore();
  const [newTerm, setNewTerm] = useState("");
  const [newReplacement, setNewReplacement] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    listGlossaryTerms()
      .then(setTerms)
      .catch(console.error);
  }, [setTerms]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm || !newReplacement) return;
    
    try {
      const data = await createGlossaryTerm({ term: newTerm, replacement: newReplacement, description });
      addTerm(data);
      setNewTerm("");
      setNewReplacement("");
      setDescription("");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to add term. It might already exist.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteGlossaryTerm(id);
      removeTerm(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Brand Glossary</h1>
        <p className="text-muted-foreground mt-2">
          Define approved words and terminology that influence script generation and translations.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-4 items-end bg-card p-4 border rounded-lg shadow-sm">
        <div className="space-y-2 flex-1">
          <label className="text-sm font-medium">Original Term</label>
          <Input 
            value={newTerm} 
            onChange={(e) => setNewTerm(e.target.value)} 
            placeholder="e.g. AI" 
            required 
          />
        </div>
        <div className="space-y-2 flex-1">
          <label className="text-sm font-medium">Replacement</label>
          <Input 
            value={newReplacement} 
            onChange={(e) => setNewReplacement(e.target.value)} 
            placeholder="e.g. Artificial Intelligence" 
            required 
          />
        </div>
        <div className="space-y-2 flex-1">
          <label className="text-sm font-medium">Description (Optional)</label>
          <Input 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Context..." 
          />
        </div>
        <Button type="submit">Add Term</Button>
      </form>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Term</th>
              <th className="p-4 font-medium">Replacement</th>
              <th className="p-4 font-medium">Description</th>
              <th className="p-4 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {terms.map(term => (
              <tr key={term.id}>
                <td className="p-4 font-medium">{term.term}</td>
                <td className="p-4 text-green-600 font-medium">{term.replacement}</td>
                <td className="p-4 text-muted-foreground">{term.description || "-"}</td>
                <td className="p-4">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(term.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {terms.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No terms added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
