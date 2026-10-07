import { expect, it } from "vitest";
import { calendarRange, monthCells, shiftMonth } from "./calendar";
import { weekday } from "./dates";

it("monta fevereiro bissexto em semanas completas de segunda a domingo", () => {
  const cells = monthCells("2024-02");
  expect(cells).toHaveLength(35);
  expect(cells[0]).toBe("2024-01-29");
  expect(cells).toContain("2024-02-29");
  expect(cells.at(-1)).toBe("2024-03-03");
  expect(weekday(cells[0])).toBe(1);
  expect(new Set(cells).size).toBe(cells.length);
});

it("usa seis semanas quando o mês precisa de 42 quadrados", () => {
  const cells = monthCells("2026-03");
  expect(cells).toHaveLength(42);
  expect(cells[0]).toBe("2026-02-23");
  expect(cells.at(-1)).toBe("2026-04-05");
});

it("navega entre anos e limita a agenda a meses completos", () => {
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(calendarRange("2026-10-07")).toEqual({ startDate: "2025-10-01", endDate: "2027-10-31" });
});
