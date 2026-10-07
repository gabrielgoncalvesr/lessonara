import { Icon } from "./icon";
import { formatDate } from "@/lib/dates";
import { formatFileSize } from "@/lib/document-rules";
import type { Material } from "@/lib/documents";

export function StudentMaterials({ materials, slug }: { materials: Material[]; slug: string }) {
  return <section className="card"><div className="section-heading mb-5"><div><h2>Seus materiais<span className="count-badge">{materials.length}</span></h2><p>Arquivos que sua professora compartilhou com você.</p></div><Icon name="book" className="h-5 w-5 text-accent" /></div>{materials.length ? <ul className="student-material-list">{materials.map((material) => <li key={material.id}><span className="document-type"><Icon name="book" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{material.title}</h3>{material.subject && <p className="mt-1 text-xs text-accent">{material.subject}</p>}<p className="mt-2 text-xs text-muted">{formatFileSize(material.byteSize)} · {material.expiresOn ? `Disponível até ${formatDate(material.expiresOn)}` : "Sem prazo de acesso"}</p></div><a className="btn-ghost" href={`/a/${encodeURIComponent(slug)}/materiais/${material.id}`} target="_blank" rel="noreferrer">Baixar arquivo</a></li>)}</ul> : <div className="empty-state"><Icon name="book" className="mx-auto mb-4 h-8 w-8 text-accent" /><h3>Seus próximos materiais aparecem aqui</h3><p>Assim que sua professora compartilhar um arquivo, você poderá acessá-lo nesta aba.</p></div>}</section>;
}
