"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

import {
  ArrowLeft,
  ClipboardCopy,
  Loader2Icon,
  CircleCheckBig,
} from "lucide-react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import MobileNav from "@/components/nav/mobileNav";
import { useToast } from "@/hooks/use-toast";

import template from "@/utils/template";
import { runAiTextModel, saveQuery } from "@/actions/ai";

import { useUser } from "@clerk/nextjs";
import { useUsage } from "@/context/usage";

import "froala-editor/css/froala_style.min.css";
import "froala-editor/css/froala_editor.pkgd.min.css";
import FroalaEditorComponent from "react-froala-wysiwyg";

import { Template, Form } from "@/utils/types";

export default function Page({ params }: { params: { slug: string } }) {
  const t = template.find((item) => item.slug === params.slug) as Template;

  const { toast } = useToast();

  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress || "";

  const [query, setQuery] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [coppied, setCoppied] = useState(false);
  const { fetchUsage, subscribed, count } = useUsage();

  // Usando useRef para acessar a instância do editor
  const editorRef = useRef<any>(null);

  // Efeito para definir o conteúdo no editor quando a resposta da IA chegar
  useEffect(() => {
    if (editorRef.current && editorRef.current.getInstance && content) {
      // Certifique-se de que o editor foi inicializado antes de tentar acessar sua instância
      const editorInstance = editorRef.current.getInstance();
      editorInstance.setMarkdown(content);
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await runAiTextModel(t.aiPrompt + query);
      setContent(data);

      await saveQuery(t, email, query, data);
      fetchUsage();
    } catch (error) {
      setContent("An error occurred while generating the content.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const editorInstance = editorRef.current.getInstance();
    const c = editorInstance.getMarkdown();

    try {
      await navigator.clipboard.writeText(c);
      setCoppied(true);
      toast({
        description: "Coppied to Clipboard",
      });
    } catch {
      toast({
        description: "Failed to copy to Clipboard",
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between gap-5 p-6 pb-0">
        <div className="md:hidden w-full">
          <MobileNav />
        </div>

        <Link href="/dashboard">
          <Button
            className="w-fit py-6 flex gap-2 rounded-xl"
            variant="outline">
            <ArrowLeft size={20} />
            Back
          </Button>
        </Link>

        {coppied ? (
          <Button
            className="w-fit py-6 mt-2 flex gap-2 rounded-xl"
            onClick={() => handleCopy()}
            variant="outline">
            <CircleCheckBig size={20} />
            Coppied
          </Button>
        ) : (
          <Button
            className="w-fit py-6 flex gap-2 rounded-xl"
            onClick={() => handleCopy()}
            variant="outline">
            <ClipboardCopy size={20} />
            Copy <span className="hidden md:block">to Clipboard</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-5 gap-x-0 p-6 w-full md:gap-x-5">
        <div className="col-span-1 bg-slate-100 dark:bg-gray-900/50 rounded-xl border p-8 h-fit w-full">
          <div className="flex flex-col gap-3">
            <Image src={t.icon} alt={t.name} width={50} height={50} />
            <h2 className="font-medium text-lg">{t.name}</h2>
            <p className="text-gray-500">{t.desc}</p>
          </div>

          <form className="mt-6" onSubmit={handleSubmit}>
            {t.form.map((item, index) => (
              <div key={index} className="my-2 flex flex-col gap-2">
                <label className="font-bold pb-5"> {item.label}</label>

                {item.field === "input" ? (
                  <Input
                    key={index}
                    name={item.name}
                    required={item.required}
                    className="py-6"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                ) : item.field === "textarea" ? (
                  <Textarea
                    key={index}
                    name={item.name}
                    required={item.required}
                    className="py-6"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                ) : null}
              </div>
            ))}

            <Button
              type="submit"
              className="w-full py-6 mt-2"
              disabled={
                loading ||
                (!subscribed &&
                  count >= Number(process.env.NEXT_PUBLIC_FREE_PLAN_USAGE))
              }>
              {loading && (
                <Loader2Icon size={24} className="animate-spin mr-2" />
              )}
              {subscribed ||
              count < Number(process.env.NEXT_PUBLIC_FREE_PLAN_USAGE)
                ? "Generate Content"
                : "Subscribe to Continue"}
            </Button>
          </form>
        </div>

        <div className="col-span-2 flex flex-col gap-2">
          <FroalaEditorComponent
            tag="textarea"
            config={{ placeholderText: "Edit Your Content Here" }}
            model={content}
            onModelChange={(model: any) => setContent(model)}
          />
        </div>
      </div>
    </div>
  );
}
