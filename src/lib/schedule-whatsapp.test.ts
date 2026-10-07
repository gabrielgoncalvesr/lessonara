import { expect, it } from "vitest";
import { canAddWeeklySchedule, weeklyScheduleLimit } from "./schedule-rules";
import { DEFAULT_WHATSAPP_MESSAGE, paymentWhatsAppUrl } from "./whatsapp";

const friday = { weekday: 5, time: "20:00", starts_on: "2026-06-19", ends_on: null };

it("limita pacotes de 4 a um horário e de 8 a dois", () => {
  expect(weeklyScheduleLimit(4)).toBe(1);
  expect(weeklyScheduleLimit(8)).toBe(2);
  expect(canAddWeeklySchedule([friday], 1, "2026-10-07", 1)).toBe(false);
  expect(canAddWeeklySchedule([friday], 2, "2026-10-07", 1)).toBe(true);
  expect(canAddWeeklySchedule([friday, { ...friday, weekday: 2 }], 2, "2026-10-07", 1)).toBe(false);
});

it("libera troca de horário após a última aula efetiva do antigo", () => {
  expect(canAddWeeklySchedule([{ ...friday, ends_on: "2026-10-09" }], 1, "2026-10-07", 1)).toBe(true);
  expect(canAddWeeklySchedule([{ ...friday, ends_on: "2026-10-16" }], 1, "2026-10-07", 1)).toBe(false);
});

it("conta horários futuros que vão sobrepor o novo", () => {
  expect(canAddWeeklySchedule([{ ...friday, starts_on: "2026-11-01" }], 1, "2026-10-07", 1)).toBe(false);
});

it("monta a mensagem exata e abre conversa pelo telefone com DDD", () => {
  const url = new URL(paymentWhatsAppUrl("(11) 99999-9999")!);
  expect(url.pathname).toBe("/5511999999999");
  expect(url.searchParams.get("text")).toBe(DEFAULT_WHATSAPP_MESSAGE);
  expect(new URL(paymentWhatsAppUrl("")!).pathname).toBe("/");
  expect(paymentWhatsAppUrl("123")).toBeNull();
  expect(new URL(paymentWhatsAppUrl("+1 202 555 0100")!).pathname).toBe("/12025550100");
});
