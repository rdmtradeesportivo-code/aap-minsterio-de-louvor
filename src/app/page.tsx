import Link from "next/link";
import { Music4, CalendarDays, Users, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Music4,
    title: "Repertório com cifra",
    description: "Letra e acorde juntos, com transposição de tom em um clique.",
  },
  {
    icon: CalendarDays,
    title: "Roteiro de culto",
    description: "Monte a ordem das músicas de cada culto ou ensaio em segundos.",
  },
  {
    icon: Users,
    title: "Escala da equipe",
    description: "Convide voluntários por função e acompanhe quem confirmou.",
  },
];

export default function Home() {
  return (
    <div className="bg-app-gradient relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/30">
          <Music4 className="h-7 w-7 text-white" strokeWidth={2} />
        </div>

        <h1 className="mt-6 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          O ministério de louvor,{" "}
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            organizado
          </span>
        </h1>
        <p className="mt-4 max-w-lg text-balance text-base text-slate-600 sm:text-lg">
          Repertório, roteiro de culto e escala de voluntários da sua equipe, tudo em
          um só lugar.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/cadastro" className={buttonVariants({ size: "md", className: "px-6 h-11" })}>
            Criar conta grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "secondary", size: "md", className: "px-6 h-11" })}
          >
            Entrar
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-5 text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <feature.icon className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{feature.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
