import { nowInTZ,formatDate } from "./dates";
export function activityDateTime(value:string){const {today,time}=nowInTZ(new Date(value));return `${formatDate(today)} às ${time}`;}
