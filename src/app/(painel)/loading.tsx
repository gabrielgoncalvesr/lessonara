export default function Loading() {
  return (
    <div role="status" aria-label="Carregando página" className="space-y-6">
      <p className="page-description">Carregando seu espaço…</p>
      <div aria-hidden="true" className="card space-y-6 motion-safe:animate-pulse">
        <div className="h-6 w-1/3 rounded-lg bg-line" />
        <div className="h-4 w-2/3 rounded bg-line" />
        <div className="h-4 w-1/2 rounded bg-line" />
        <div className="h-4 w-2/3 rounded bg-line" />
      </div>
    </div>
  );
}
