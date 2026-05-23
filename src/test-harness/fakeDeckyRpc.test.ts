import { describe, expect, it } from "vitest";
import {
  assertAllFrontendRpcMethodsRegistered,
  dispatchFakeRpc,
  FRONTEND_RPC_METHODS,
  getRpcCallLog,
  resetFakeDeckyRpc,
} from "./fakeDeckyRpc";

describe("fakeDeckyRpc registry", () => {
  it("registers default handlers for every frontend RPC method", () => {
    expect(() => assertAllFrontendRpcMethodsRegistered()).not.toThrow();
    expect(FRONTEND_RPC_METHODS.length).toBeGreaterThan(10);
  });

  it("records call log and resets between tests", async () => {
    resetFakeDeckyRpc();
    await dispatchFakeRpc("get_deck_ip", []);
    expect(getRpcCallLog()).toHaveLength(1);
    expect(getRpcCallLog()[0]?.method).toBe("get_deck_ip");
  });

  it("throws on unknown methods", async () => {
    resetFakeDeckyRpc();
    await expect(dispatchFakeRpc("not_a_real_rpc", [])).rejects.toThrow(/unhandled method/);
  });
});
