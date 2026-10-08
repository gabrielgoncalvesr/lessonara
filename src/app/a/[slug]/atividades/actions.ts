"use server";
import { beginActivitySubmission as begin, cancelActivitySubmission as cancel, finishActivitySubmission as finish } from "@/app/(painel)/atividades/actions";
export async function beginActivitySubmission(slug:string,activityId:string,input:{fileName:string;byteSize:number}){return begin(slug,activityId,input);}
export async function cancelActivitySubmission(slug:string,activityId:string){return cancel(slug,activityId);}
export async function finishActivitySubmission(slug:string,activityId:string,submissionId:string,note:string){return finish(slug,activityId,submissionId,note);}
