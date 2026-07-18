import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">Ministério de Louvor</h1>
          <p className="mt-1 text-sm text-slate-500">Entre para acessar o app</p>
        </div>
        <LoginForm next={next ?? "/dashboard"} />
      </div>
    </div>
  );
}
