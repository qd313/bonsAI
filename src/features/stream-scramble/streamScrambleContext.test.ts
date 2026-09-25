import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";

import { STREAM_SCRAMBLE_OFF, StreamScrambleContext } from "./streamScrambleContext";

describe("StreamScrambleContext default", () => {
  it("a reader with no provider above it sees the switch off, at the schema defaults", () => {
    const { result } = renderHook(() => React.useContext(StreamScrambleContext));
    expect(result.current).toEqual(STREAM_SCRAMBLE_OFF);
  });
});
