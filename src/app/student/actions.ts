"use server";
import { beginActivitySubmission as begin,cancelActivitySubmission as cancel,finishActivitySubmission as finish } from "@/app/(panel)/activities/actions";
export async function beginActivitySubmission(studentId:string,activityId:string,input:{fileName:string;byteSize:number}){return begin(studentId,activityId,input);}
export async function cancelActivitySubmission(studentId:string,activityId:string){return cancel(studentId,activityId);}
export async function finishActivitySubmission(studentId:string,activityId:string,submissionId:string,note:string){return finish(studentId,activityId,submissionId,note);}
