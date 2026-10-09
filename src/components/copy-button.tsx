"use client";
import {useI18n} from "@/components/browser-preferences-provider";
import {BusyContent} from "./busy-content";
import {useRef,useState} from "react";
export function CopyButton({text,label="Copiar link"}:{text:string;label?:string}){
 const {t}=useI18n();const [copied,setCopied]=useState(false);const [pending,setPending]=useState(false);const [error,setError]=useState(false);const running=useRef(false);
 return <><button type="button" className="btn-xs" disabled={pending} aria-busy={pending} onClick={async()=>{if(running.current)return;running.current=true;setPending(true);setError(false);try{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{setError(true);}finally{running.current=false;setPending(false);}}}><BusyContent pending={pending}>{copied?t("Copiado!"):t(label)}</BusyContent></button>{error&&<span role="status" className="text-xs text-muted">{t("Copie o link manualmente:")} {text}</span>}</>;
}
