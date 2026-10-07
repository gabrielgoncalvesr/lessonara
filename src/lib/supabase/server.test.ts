import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  cookies: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));

import { createClient } from "./server";

beforeEach(() => vi.resetAllMocks());

it("aguarda uma requisição antes de inicializar o auth do Supabase", async () => {
  let acceptRequest!: () => void;
  mocks.connection.mockReturnValue(new Promise<void>((resolve) => { acceptRequest = resolve; }));
  mocks.cookies.mockResolvedValue({ getAll: () => [], set: vi.fn() });
  const client = { auth: {} };
  mocks.createServerClient.mockReturnValue(client);

  const pending = createClient();
  expect(mocks.connection).toHaveBeenCalledOnce();
  expect(mocks.cookies).not.toHaveBeenCalled();
  expect(mocks.createServerClient).not.toHaveBeenCalled();

  acceptRequest();
  expect(await pending).toBe(client);
  expect(mocks.cookies).toHaveBeenCalledOnce();
  expect(mocks.createServerClient).toHaveBeenCalledOnce();
});
