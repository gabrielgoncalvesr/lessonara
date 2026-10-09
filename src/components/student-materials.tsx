"use client";
import {useI18n} from "@/components/browser-preferences-provider";
import { Icon } from "./icon";
import { formatDate } from "@/lib/dates";
import { formatFileSize } from "@/lib/document-rules";
import type { Material } from "@/lib/documents";
export function StudentMaterials({ materials, slug }: {
    materials: Material[];
    slug: string;
}) {
    const { t, locale } = useI18n();
    return <section className="card"><div className="section-heading mb-5"><div><h2>{t("Seus materiais")}<span className="count-badge">{materials.length}</span></h2><p>{t("Arquivos que sua professora compartilhou com voc\u00EA.")}</p></div><Icon name="book" className="h-5 w-5 text-accent"/></div>{materials.length ? <ul className="student-material-list">{materials.map((material) => <li key={material.id}><span className="document-type"><Icon name="book" className="h-5 w-5"/></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{material.title}</h3>{material.subject && <p className="mt-1 text-xs text-accent">{material.subject}</p>}<p className="mt-2 text-xs text-muted">{formatFileSize(material.byteSize)}{t(" \u00B7 ")}{material.expiresOn ? t("Dispon\u00EDvel at\u00E9 {value0}", { value0: formatDate(material.expiresOn, locale) }) : t("Sem prazo de acesso")}</p></div><a className="btn-ghost" href={`/student/portal/${encodeURIComponent(slug)}/materials/${material.id}`} target="_blank" rel="noreferrer">{t("Baixar arquivo")}</a></li>)}</ul> : <div className="empty-state"><Icon name="book" className="mx-auto mb-4 h-8 w-8 text-accent"/><h3>{t("Seus pr\u00F3ximos materiais aparecem aqui")}</h3><p>{t("Assim que sua professora compartilhar um arquivo, voc\u00EA poder\u00E1 acess\u00E1-lo nesta aba.")}</p></div>}</section>;
}
