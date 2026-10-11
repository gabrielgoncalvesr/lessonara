"use client";
import {usePlatformPlan} from "./platform-plan-provider";
import {formatFileSize as uploadSize} from "@/lib/document-rules";
import { useEffect, useRef, useState, type RefObject, type PointerEvent } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { emptyMaterial, type MaterialState, type PdfPoint } from "@/lib/classroom-material";
import { beginDocumentUpload, finishDocumentUpload, removeLibraryDocument } from "@/app/(panel)/documents/actions";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { DOCUMENT_BUCKET, validateDocumentFile } from "@/lib/document-rules";
import { Icon } from "./icon";
import { notify } from "./toast";

type Tool="pen"|"laser"|"text"|null;
type Snapshot={token:string;state:MaterialState;issuedAt:number;title:string};
type Option={id:string;title:string;file_name:string};
export function ClassroomPdf({endpoint,teacher,connected,messageRef,broadcast,onOpen}:{endpoint:string;teacher:boolean;connected:boolean;messageRef:RefObject<((text:string)=>void)|null>;broadcast:(text:string)=>void;onOpen:(open:boolean)=>void}) {
  const plan=usePlatformPlan();
  const [state,setState]=useState<MaterialState>(emptyMaterial);
  const stateRef=useRef(state);const token=useRef("");const issued=useRef(0);const titleRef=useRef("");
  const [title,setTitle]=useState("");const [tool,setTool]=useState<Tool>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const [options,setOptions]=useState<Option[]>([]);const [picker,setPicker]=useState(false);const dialog=useRef<HTMLDialogElement>(null);const uploadInput=useRef<HTMLInputElement>(null);
  const scrollBox=useRef<HTMLDivElement>(null);const canvas=useRef<HTMLCanvasElement>(null);const pageBox=useRef<HTMLDivElement>(null);const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);const [size,setSize]=useState({width:650,height:850});const [count,setCount]=useState(1);
  const [textEntry,setTextEntry]=useState<{x:number;y:number;text:string}|null>(null);
  const active=state.board||Boolean(state.documentId);const mounted=useRef(true);const loading=useRef("");
  const pending=useRef(false);const queue=useRef<MaterialState|null>(null);const publishTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const chunks=useRef(new Map<string,{parts:string[];total:number;at:number}>());const drawing=useRef<{id:string;page:number;kind:"pen"|"laser";at:number;points:PdfPoint[]}|null>(null);
  async function api(op:string,extra:Record<string,unknown>={}) {const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({op,...extra}),cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível atualizar o material.");return data;}
  function announce(value:string) {const id=crypto.randomUUID();const total=Math.ceil(value.length/8000);for(let index=0;index<total;index++)broadcast(JSON.stringify({t:"lessonara-pdf",id,index,total,part:value.slice(index*8000,(index+1)*8000)}));}
  function apply(snapshot:Snapshot) {if(snapshot.issuedAt<issued.current)return;issued.current=snapshot.issuedAt;token.current=snapshot.token;titleRef.current=snapshot.title;setTitle(snapshot.title);stateRef.current=snapshot.state;setState(snapshot.state);setError("");if(loading.current!==snapshot.state.documentId){setPdf(null);setCount(1);}}
  async function flush() {
    if(pending.current||!queue.current||!teacher)return;
    const next=queue.current;queue.current=null;pending.current=true;
    try {const saved=await api("publish",{state:next}) as Snapshot;if(!mounted.current)return;token.current=saved.token;issued.current=saved.issuedAt;announce(saved.token);}
    catch(e){notify(e instanceof Error?e.message:"Não foi possível sincronizar a anotação.");}
    finally {pending.current=false;if(queue.current&&mounted.current)void flush();}
  }
  function update(next:MaterialState) {stateRef.current=next;setState(next);queue.current=next;if(publishTimer.current)clearTimeout(publishTimer.current);publishTimer.current=setTimeout(()=>void flush(),120);}
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(publishTimer.current)clearTimeout(publishTimer.current);};},[]);
  useEffect(()=>{onOpen(active);},[active,onOpen]);
  useEffect(()=>{
    messageRef.current=(text)=>{
      try {const message=JSON.parse(text);
        if(message.t==="lessonara-pdf-request"){if(token.current)announce(token.current);return;}
        if(message.t!=="lessonara-pdf"||typeof message.id!=="string"||message.id.length>80||!Number.isInteger(message.total)||message.total<1||message.total>20||!Number.isInteger(message.index)||message.index<0||message.index>=message.total||typeof message.part!=="string"||message.part.length>8000)return;
        for(const [id,value] of chunks.current)if(Date.now()-value.at>10000)chunks.current.delete(id);
        if(!chunks.current.has(message.id)){if(chunks.current.size>=5)return;chunks.current.set(message.id,{parts:[],total:message.total,at:Date.now()});}
        const value=chunks.current.get(message.id)!;if(value.total!==message.total)return;value.parts[message.index]=message.part;
        if(Array.from({length:value.total},(_,i)=>typeof value.parts[i]==="string").every(Boolean)) {chunks.current.delete(message.id);const received=value.parts.join("");if(received===token.current)return;void api("read",{token:received}).then((snapshot:Snapshot)=>{if(mounted.current&&!pending.current&&!queue.current&&!drawing.current)apply(snapshot);}).catch(()=>{});}
      } catch {}
    };
    broadcast(JSON.stringify({t:"lessonara-pdf-request"}));
    return()=>{messageRef.current=null;};
    // The transport callback always reads refs so it does not restart while drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[endpoint,teacher,messageRef]);
  useEffect(()=>{
    if(!state.documentId)return;
    const documentId=state.documentId;let cancelled=false;let task:{destroy:()=>Promise<void>}|null=null;
    loading.current=documentId;
    async function load(){try {
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({op:"file",token:token.current}),cache:"no-store"});if(!response.ok)throw new Error("Não foi possível abrir este PDF.");
      const location=await response.json();const file=await fetch(location.url,{referrerPolicy:"no-referrer"});if(!file.ok)throw new Error("Não foi possível baixar o PDF.");const data=new Uint8Array(await file.arrayBuffer());const lib=await import("pdfjs-dist");lib.GlobalWorkerOptions.workerSrc="/pdf.worker.min.mjs";
      const document=lib.getDocument({data,enableXfa:false,cMapUrl:"/pdf-assets/cmaps/",cMapPacked:true,standardFontDataUrl:"/pdf-assets/standard_fonts/",wasmUrl:"/pdf-assets/wasm/"});task=document;const value=await document.promise;
      if(cancelled){await document.destroy();return;}setPdf(value);setCount(value.numPages);
    }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"PDF inválido.");}}
    void load();return()=>{cancelled=true;void task?.destroy();};
  },[state.documentId,endpoint]);
  useEffect(()=>{const box=pageBox.current;if(!box)return;const observer=new ResizeObserver(()=>{const width=Math.max(220,Math.min(1000,box.clientWidth));setSize(s=>({...s,width}));});observer.observe(box);return()=>observer.disconnect();},[active]);
  useEffect(()=>{
    let task:RenderTask|undefined;let cancelled=false;
    async function render(){if(!pdf||!canvas.current)return;try {const page=await pdf.getPage(Math.min(state.page,pdf.numPages));if(cancelled||!canvas.current)return;const viewport=page.getViewport({scale:size.width/page.getViewport({scale:1}).width});const pixelRatio=Math.min(window.devicePixelRatio||1,2);const node=canvas.current;node.width=Math.round(viewport.width*pixelRatio);node.height=Math.round(viewport.height*pixelRatio);setSize(s=>({...s,height:viewport.height}));task=page.render({canvas:node,viewport,transform:pixelRatio===1?undefined:[pixelRatio,0,0,pixelRatio,0,0]});await task.promise;}catch(e){if(!cancelled&&!(e instanceof Error&&e.name==="RenderingCancelledException"))setError("Não foi possível renderizar esta página.");}}
    void render();return()=>{cancelled=true;task?.cancel();};
  },[pdf,state.page,size.width]);
  useEffect(()=>{if(scrollBox.current&&!teacher)scrollBox.current.scrollTop=(state.scrollY??0)*scrollBox.current.scrollHeight;},[teacher,state.scrollY,state.page,state.documentId,size.height]);
  useEffect(()=>{if(scrollBox.current)scrollBox.current.scrollTop=0;},[state.page,state.documentId]);
  async function choose(option?:Option,board=false) {setBusy(true);queue.current=null;if(publishTimer.current)clearTimeout(publishTimer.current);while(pending.current)await new Promise(resolve=>setTimeout(resolve,60));pending.current=true;try {const saved=await api("publish",{state:{...emptyMaterial(),documentId:option?.id??null,board}}) as Snapshot;apply(saved);announce(saved.token);dialog.current?.close();setPicker(false);setTool(null);}catch(e){notify(e instanceof Error?e.message:"Não foi possível abrir o material.");}finally{pending.current=false;setBusy(false);}}
  async function openPicker(){setPicker(true);dialog.current?.showModal();try{setOptions((await api("library")).documents);}catch(e){notify(e instanceof Error?e.message:"Não foi possível carregar a área de Documentos.");}}
  async function upload(file:File){let id:string|null=null;setBusy(true);try {validateDocumentFile(file.name,file.size,plan.maxFileBytes);if(!file.name.toLowerCase().endsWith(".pdf")||new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=="%PDF-")throw new Error("Escolha um arquivo PDF válido.");const prepared=await beginDocumentUpload({title:file.name.replace(/\.pdf$/i,"").slice(0,120),subject:"",fileName:file.name,byteSize:file.size});if(!prepared.ok)throw new Error(prepared.message);id=prepared.data.id;const sent=await createBrowserSupabase().storage.from(DOCUMENT_BUCKET).uploadToSignedUrl(prepared.data.path,prepared.data.token,file,{contentType:prepared.data.mimeType});if(sent.error)throw new Error("O envio do PDF falhou.");const finished=await finishDocumentUpload(id);if(!finished.ok)throw new Error(finished.message);await choose({id,title:file.name.replace(/\.pdf$/i,"").slice(0,120),file_name:file.name});}catch(e){if(id)await removeLibraryDocument(id,true);notify(e instanceof Error?e.message:"Não foi possível enviar o PDF.");}finally{setBusy(false);if(uploadInput.current)uploadInput.current.value="";}}
  function point(event:PointerEvent<SVGSVGElement>):PdfPoint {const rect=event.currentTarget.getBoundingClientRect();return [Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))];}
  function down(event:PointerEvent<SVGSVGElement>){if(!teacher||!tool||busy)return;event.preventDefault();const [x,y]=point(event);if(tool==="text"){setTextEntry({x,y,text:""});return;}event.currentTarget.setPointerCapture(event.pointerId);drawing.current={id:crypto.randomUUID(),page:stateRef.current.page,kind:tool,at:Date.now(),points:[[x,y]]};setState({...stateRef.current,strokes:[...stateRef.current.strokes,drawing.current]});}
  function move(event:PointerEvent<SVGSVGElement>){const stroke=drawing.current;if(!stroke)return;if(stroke.points.length>=500)return;stroke.points=[...stroke.points,point(event)];stroke.at=Date.now();setState({...stateRef.current,strokes:[...stateRef.current.strokes,stroke]});if(stroke.kind==="laser")update({...stateRef.current,strokes:[...stateRef.current.strokes.filter(s=>s.id!==stroke.id&&s.kind!=="laser"),stroke]});}
  function end(){if(!drawing.current)return;const stroke=drawing.current;drawing.current=null;update({...stateRef.current,strokes:[...stateRef.current.strokes.filter(s=>s.id!==stroke.id&&s.kind!=="laser"),stroke]});}
  function stop(){end();setTool(null);setTextEntry(null);}
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if(event.key==="Escape")stop();};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);});
  const [clock,setClock]=useState(0);useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(timer);},[]);
  return <><div className="classroom-material-toolbar"><strong>{active?title||"Quadro":"Sala de aula"}</strong><span role="status" className="text-xs text-muted">{connected?"Sincronização conectada":"Conectando sincronização…"}</span>{teacher&&<div className="flex gap-2"><button className="btn-xs" disabled={busy} onClick={()=>void openPicker()}><Icon name="book" className="h-4 w-4"/>Abrir PDF</button><button className="btn-xs" disabled={busy} onClick={()=>void choose(undefined,true)}>Quadro</button></div>}{active&&teacher&&<button className="btn-xs" disabled={busy} onClick={()=>void choose()}>Fechar material</button>}{!teacher&&active&&<span className="text-xs text-muted">Professor apresentando · somente leitura</span>}</div>
    {active&&<section className="classroom-pdf-panel" aria-label="Material apresentado na aula"><div className="classroom-pdf-tools">{teacher?<><button className="btn-xs" disabled={state.page<=1||busy} onClick={()=>update({...stateRef.current,page:state.page-1,scrollY:0})}>Anterior</button><span>Página {state.page} de {state.board?1:count}</span><button className="btn-xs" disabled={state.page>=count||busy||state.board} onClick={()=>update({...stateRef.current,page:state.page+1,scrollY:0})}>Próxima</button>{(["laser","pen","text"] as const).map(name=><button key={name} className={`btn-xs ${tool===name?"pdf-tool-selected":""}`} aria-pressed={tool===name} onClick={()=>{end();setTool(tool===name?null:name);}}>{name==="laser"?"Laser":name==="pen"?"Caneta":"Texto"}</button>)}<button className="btn-xs" onClick={()=>update({...stateRef.current,strokes:[],texts:[]})}>Limpar</button><button className="btn-xs" title="Desativar ferramenta (Esc)" aria-label="Desativar ferramenta" disabled={!tool} onClick={stop}>×</button></>:<span>Página {state.page} de {state.board?1:count}</span>}</div><div ref={scrollBox} className="classroom-pdf-scroll" onScroll={event=>{if(teacher&&!busy){const node=event.currentTarget;const scrollY=node.scrollHeight?node.scrollTop/node.scrollHeight:0;update({...stateRef.current,scrollY});}}}><div ref={pageBox} className="classroom-pdf-page" style={{aspectRatio:state.board?"4 / 3":`${size.width} / ${size.height}`}}><canvas ref={canvas} hidden={state.board} aria-label={`Página ${state.page} do PDF`}/>{textEntry&&teacher&&<input autoFocus className="pdf-text-input" style={{left:`${textEntry.x*100}%`,top:`${textEntry.y*100}%`}} aria-label="Texto da anotação" placeholder="Texto e Enter" maxLength={200} value={textEntry.text} onChange={e=>setTextEntry({...textEntry,text:e.target.value})} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(textEntry.text.trim())update({...stateRef.current,texts:[...stateRef.current.texts,{id:crypto.randomUUID(),page:stateRef.current.page,x:textEntry.x,y:textEntry.y,text:textEntry.text.trim()}]});setTextEntry(null);}if(e.key==="Escape")stop();}}/>}<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className={`classroom-pdf-overlay ${teacher&&tool?"pdf-drawing":""}`} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label="Anotações do professor">{state.strokes.filter(s=>s.page===state.page&&(s.kind!=="laser"||clock-s.at<2500)).map(s=><polyline key={s.id} points={s.points.map(([x,y])=>`${x*1000},${y*1000}`).join(" ")} stroke="#c53e35" strokeWidth={s.kind==="laser"?5:3} strokeLinecap="round" strokeLinejoin="round" fill="none" vectorEffect="non-scaling-stroke"/>)}{state.texts.filter(t=>t.page===state.page).map(t=><text key={t.id} x={t.x*1000} y={t.y*1000} fill="#b42c28" fontSize="24">{t.text}</text>)}</svg>{error&&<p className="pdf-error" role="alert">{error}</p>}{!state.board&&!pdf&&!error&&<p className="pdf-error" role="status">Abrindo PDF…</p>}</div></div></section>}
    {teacher&&<dialog ref={dialog} className="document-picker-dialog card" aria-label="Abrir PDF na sala" onCancel={()=>setPicker(false)}><div className="section-heading"><h2 className="h2">Abrir PDF na sala</h2><button className="btn-xs" onClick={()=>{dialog.current?.close();setPicker(false);}}>Fechar</button></div><input ref={uploadInput} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}}/><button className="btn" disabled={busy} onClick={()=>uploadInput.current?.click()}>{busy?"Enviando…":"Enviar novo PDF"}</button><p className="text-xs text-muted my-4">Até {uploadSize(plan.maxFileBytes)}. O arquivo fica em Documentos; as anotações são temporárias na sala.</p><div className="document-picker-options">{options.map(option=><button key={option.id} disabled={busy} onClick={()=>void choose(option)}><Icon name="book" className="h-5 w-5"/><span><strong>{option.title}</strong><small>{option.file_name}</small></span></button>)}{picker&&!options.length&&<p className="text-sm text-muted p-4">Nenhum PDF em Documentos.</p>}</div></dialog>}</>;
}
