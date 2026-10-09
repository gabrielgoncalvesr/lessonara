import {expect,it} from "vitest";
import {isPublicPath} from "./public-routes";
it.each(["/login","/a/link","/student","/student/login","/p/teacher/s/student","/api/cron/emails","/api/preferences"])("reconhece rota pública %s",path=>expect(isPublicPath(path)).toBe(true));
it.each(["/","/students","/students/new","/students/student","/aluno-admin","/emails","/settings"])("não confunde o painel com o prefixo aluno %s",path=>expect(isPublicPath(path)).toBe(false));
