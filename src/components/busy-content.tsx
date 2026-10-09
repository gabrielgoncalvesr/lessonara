import type {ReactNode} from "react";
export function BusyContent({pending,label,children}:{pending:boolean;label?:ReactNode;children:ReactNode}){return <>{pending&&<span className="action-spinner" aria-hidden="true"/>}{pending?(label??children):children}</>;}
