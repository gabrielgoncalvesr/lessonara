"use client";
import {useRef,useState,type ReactNode,type ButtonHTMLAttributes} from "react";
import {useFormStatus} from "react-dom";
import {useI18n} from "./browser-preferences-provider";
import {Icon,type IconName} from "./icon";
import {BusyContent} from "./busy-content";
export function ActionForm({action,children,className,id}:{action:(data:FormData)=>void|Promise<void>;children:ReactNode;className?:string;id?:string}){
 const running=useRef(false);const [error,setError]=useState("");const {t}=useI18n();
 async function run(data:FormData){if(running.current)return;running.current=true;setError("");try{await action(data);}catch(cause){if(cause&&typeof cause==="object"&&"digest" in cause&&typeof cause.digest==="string"&&cause.digest.startsWith("NEXT_"))throw cause;setError(cause instanceof Error?cause.message:"Não foi possível concluir a ação. Tente novamente.");}finally{running.current=false;}}
 return <form id={id} className={className} action={run} onSubmit={event=>{if(running.current)event.preventDefault();}}>{children}{error&&<p role="alert" className="action-form-error text-sm text-bad">{t(error)}</p>}</form>;
}
export function SubmitButton({children,className="btn",pendingLabel="Processando…",disabled=false,icon="check",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{pendingLabel?:string;icon?:IconName|null}){
 const {pending}=useFormStatus();const {t}=useI18n();return <button {...props} type="submit" className={className} disabled={pending||disabled} aria-busy={pending}><BusyContent pending={pending} label={t(pendingLabel)}>{icon&&<Icon name={icon} className="h-4 w-4"/>}{children}</BusyContent></button>;
}
