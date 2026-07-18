"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-app-gradient flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-500" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900">Algo deu errado</h1>
        <p className="mt-2 text-sm text-slate-500">
          Ocorreu um erro inesperado. Tente novamente — se persistir, avise quem administra o app.
        </p>
        {error.message && (
          <p className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-left font-mono text-xs text-slate-500">
            {error.message}
          </p>
        )}
        <Button onClick={reset} className="mt-5">
          Tentar novamente
        </Button>
      </Card>
    </div>
  );
}
