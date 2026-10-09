import {expect,it} from "vitest";import {parseMoney,positiveLessonCount,moneyInput} from "./money";
it.each([["300,50",300.5],["1.234,56",1234.56],["300.50",300.5],["1.000",1000],["0,00",0]])("interpreta %s sem perder centavos",(value,expected)=>expect(parseMoney(value)).toBe(expected));
it.each(["-1","NaN","1,234","1.2.3","R$ 20","Infinity"])("rejeita moeda inválida %s",value=>expect(()=>parseMoney(value)).toThrow());
it.each(["-1","0","1.5","","NaN","1001"])("rejeita quantidade inválida de aulas %s",value=>expect(()=>positiveLessonCount(value)).toThrow());
it("campo opcional vazio herda o preço, e a apresentação usa duas casas",()=>{expect(parseMoney("",true)).toBeNull();expect(moneyInput(300)).toBe("300,00");expect(moneyInput(1234.5)).toBe("1.234,50");});
