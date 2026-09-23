/**
 * Covers the three parts plan 36 added to the picker: a typed custom-tag pull, the "Use for Ask"
 * pin, and the 30-day "New" badge. The TextField Decky stub renders as a plain `<div>`
 * (fakeDeckyUi.tsx), and React's ChangeEventPlugin only synthesizes `onChange` for real form
 * elements, so a DOM-dispatched "change"/"input" event on it never reaches the component (checked
 * directly, not assumed) -- the same reason `ChatSlotRenameModal.test.tsx` never simulates typing
 * either. Coverage for the custom-tag *input itself* is therefore: the pure validity check
 * (isPlausibleOllamaPullTag, in mergePullModelCatalog.test.ts) plus the button's driven-by-state
 * disabled/enabled behaviour here; the on-Deck row covers actually typing a tag.
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, waitFor, fireEvent } from "@testing-library/react";
import { toaster } from "@decky/api";

// Captures every TextField's props as PullModelsModal renders them, so the tests below can call
// its onChange directly -- see the block comment at the top of this file: the stubbed TextField
// renders as a plain <div>, and a DOM-dispatched change/input event never reaches a real onChange
// on it, so "typing" here means invoking the captured handler the same way a real keystroke would.
const hoisted = vi.hoisted(() => ({
  textFieldProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealTextField = stubs.TextField;
  const CapturingTextField = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingTextField(props, ref) {
      React.useLayoutEffect(() => {
        hoisted.textFieldProps.push(props);
      });
      return <RealTextField {...props} ref={ref} />;
    }
  );
  return { ...stubs, TextField: CapturingTextField };
});

import {
  PullModelsModal,
  computeUpdatedPullRecord,
  findUnavailableRegistryTags,
  isRecentPullModelTag,
  PULL_MODEL_NEW_BADGE_STORAGE_KEY,
  PULL_MODEL_NEW_BADGE_WINDOW_MS,
  type PullModelPullRecord,
} from "./PullModelsModal";
import { isEmbeddingOnlyTag } from "../data/pullModelCatalog";
import { getRpcCallLog, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";

/** Opens the "Type a model name" chip and types `tag` into the captured TextField, the same way
 *  the on-Deck row types into the real one -- see the note on `hoisted` above. */
function openCustomTagFieldAndType(container: HTMLElement, tag: string) {
  const chip = container.querySelector('[aria-label="Type a model name by hand"]') as HTMLButtonElement;
  fireEvent.click(chip);
  const props = hoisted.textFieldProps[hoisted.textFieldProps.length - 1];
  const onChange = props.onChange as (e: { target: { value: string } }) => void;
  act(() => {
    onChange({ target: { value: tag } });
  });
}

function renderModal(overrides: Partial<React.ComponentProps<typeof PullModelsModal>> = {}) {
  return render(
    <PullModelsModal
      activeRoutingTag={null}
      onCancel={() => {}}
      onPullAccepted={() => {}}
      embedded
      {...overrides}
    />
  );
}

function setInstalledModels(models: string[]) {
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models }));
}

/**
 * The picker defaults to "Essentials only", which shows just the three one-pull multimodal
 * presets (all "essentials"-group, all vision-capable). A "smallest"-group, text-only tag like
 * qwen2.5:1.5b or llama3.2:3b needs this off to appear as a catalog row at all.
 *
 * Essentials only lives inside the Filters panel now (plan 62, § 3d) rather than as its own
 * always-visible chip, so this opens the panel first -- the button's own accessible name is the
 * dynamic "Filters, N on: ..." summary, so it is found by its class instead.
 */
function showAllGroups(container: HTMLElement) {
  const filtersButton = container.querySelector(".bonsai-pullmodels-filters-button") as HTMLButtonElement;
  fireEvent.click(filtersButton);
  const toggle = container.querySelector(
    '[aria-label="Essentials only — show Tier 1 and Tier 2 one-model presets"]'
  ) as HTMLButtonElement;
  fireEvent.click(toggle);
  // The panel stays open until closed explicitly (it does not auto-close on a tick, so several
  // filters can be set in one visit) -- close it so the table underneath is what these tests see.
  const closeButton = container.querySelector(".bonsai-pullmodels-filterpanel-close") as HTMLButtonElement;
  fireEvent.click(closeButton);
}

describe("isEmbeddingOnlyTag", () => {
  it("spots the embedding model the knowledge base installs", () => {
    // Found on the Deck 2026-09-05 (PULL-PIN-01): nomic-embed-text is installed to serve the
    // knowledge base and carried the same "Use for Ask" star as a chat model, so one press
    // would have pointed Ask at something that cannot reply.
    expect(isEmbeddingOnlyTag("nomic-embed-text:latest")).toBe(true);
    expect(isEmbeddingOnlyTag("mxbai-embed-large")).toBe(true);
  });

  it("does not catch a chat model", () => {
    expect(isEmbeddingOnlyTag("qwen2.5:1.5b")).toBe(false);
    expect(isEmbeddingOnlyTag("gemma4:e2b-it-qat")).toBe(false);
  });
});

describe("computeUpdatedPullRecord", () => {
  const now = 1_000_000_000_000;

  it("seeds every already-installed tag as already-old on the very first run (no prior record)", () => {
    const record = computeUpdatedPullRecord(new Set(["qwen2.5:1.5b"]), null, now);
    expect(isRecentPullModelTag(record, "qwen2.5:1.5b", now)).toBe(false);
  });

  it("records a tag installed for the first time on a later run as new", () => {
    // A later run is a record that already holds at least one tag. It used to be written as {}
    // here, but an empty record now counts as a first run -- see the two-pass case below.
    const stored: PullModelPullRecord = { "gemma4:e2b-it-qat": now - 10_000 };
    const record = computeUpdatedPullRecord(new Set(["gemma4:e2b-it-qat", "qwen2.5:1.5b"]), stored, now);
    expect(isRecentPullModelTag(record, "qwen2.5:1.5b", now)).toBe(true);
    expect(record["qwen2.5:1.5b"]).toBe(now);
  });

  it("does not badge already-installed models New when the first pass ran before the model list loaded", () => {
    // The Deck failure, 2026-09-05 (PULL-NEW-BADGE-01). The modal renders once before the
    // connection test answers, so pass one sees an empty installed set. If that pass persists a
    // record, pass two -- the one that actually has the models -- reads a non-null record,
    // concludes it is not a first run, and stamps every pre-existing model as pulled today. All
    // four models on the device wore a "New" label they had not earned.
    const passOne = computeUpdatedPullRecord(new Set(), null, now);
    expect(Object.keys(passOne)).toHaveLength(0);

    const installed = new Set(["qwen2.5:1.5b", "qwen3.5:4b", "gemma4:e2b-it-qat", "nomic-embed-text:latest"]);
    const passTwo = computeUpdatedPullRecord(installed, passOne, now);
    for (const tag of installed) {
      expect(isRecentPullModelTag(passTwo, tag, now)).toBe(false);
    }
  });

  it("keeps an existing timestamp rather than overwriting it on a later observation", () => {
    const stored: PullModelPullRecord = { "qwen2.5:1.5b": now - 1000 };
    const record = computeUpdatedPullRecord(new Set(["qwen2.5:1.5b"]), stored, now);
    expect(record["qwen2.5:1.5b"]).toBe(now - 1000);
  });

  it("does not invent a timestamp for a tag that is not installed", () => {
    const record = computeUpdatedPullRecord(new Set(), {}, now);
    expect(Object.keys(record)).toHaveLength(0);
  });
});

describe("isRecentPullModelTag", () => {
  const now = 1_000_000_000_000;

  it("is true right at the moment it was recorded", () => {
    expect(isRecentPullModelTag({ tag: now }, "tag", now)).toBe(true);
  });

  it("is true just inside the 30-day window", () => {
    expect(isRecentPullModelTag({ tag: now - PULL_MODEL_NEW_BADGE_WINDOW_MS }, "tag", now)).toBe(true);
  });

  it("is false just past the 30-day window", () => {
    expect(isRecentPullModelTag({ tag: now - PULL_MODEL_NEW_BADGE_WINDOW_MS - 1 }, "tag", now)).toBe(false);
  });

  it("is false for a tag with no recorded timestamp", () => {
    expect(isRecentPullModelTag({}, "tag", now)).toBe(false);
  });

  it("is false for a timestamp in the future (clock skew) rather than throwing", () => {
    expect(isRecentPullModelTag({ tag: now + 10_000 }, "tag", now)).toBe(false);
  });
});

describe("PullModelsModal custom tag entry", () => {
  it("renders the custom tag field and starts the Pull button disabled with nothing typed", () => {
    const { container } = renderModal();
    // "Type a model name" is a chip on the Filters row now (plan 62, § 3e #4) -- pressing it is
    // what reveals the field and its Pull button, rather than either being shown by default.
    const chip = container.querySelector('[aria-label="Type a model name by hand"]') as HTMLButtonElement;
    expect(chip).not.toBeNull();
    fireEvent.click(chip);

    const field = container.querySelector('[data-decky-ui="TextField"]');
    expect(field).not.toBeNull();
    const btn = container.querySelector('[aria-label="Pull custom model tag"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });
});

describe("PullModelsModal typed-name box checks the registry before pulling", () => {
  it("says it could not find a made-up name, never starts the pull, and keeps the text in the box", async () => {
    setRpcHandler("fetch_ollama_catalog_metadata", () => ({
      source: "live",
      tags: { "made-up-model:latest": { exists: false } },
    }));

    const { container } = renderModal();
    openCustomTagFieldAndType(container, "made-up-model:latest");

    const btn = container.querySelector('[aria-label="Pull custom model tag"]') as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(false));
    fireEvent.click(btn);

    await waitFor(() => {
      expect(toaster.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Could not find", body: "made-up-model:latest" })
      );
    });

    expect(getRpcCallLog().find((c) => c.method === "pull_ollama_models")).toBeUndefined();
    const field = container.querySelector('[data-decky-ui="TextField"]');
    expect(field).not.toBeNull();
    expect((field as HTMLElement).getAttribute("value")).toBe("made-up-model:latest");
  });

  it("pulls a real name the registry confirms, same as today", async () => {
    setRpcHandler("fetch_ollama_catalog_metadata", () => ({
      source: "live",
      tags: { "qwen2.5:1.5b": { exists: true, size_bytes: 1_000_000_000 } },
    }));

    const { container } = renderModal();
    openCustomTagFieldAndType(container, "qwen2.5:1.5b");

    const btn = container.querySelector('[aria-label="Pull custom model tag"]') as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(false));
    fireEvent.click(btn);

    await waitFor(() => {
      const pullCall = getRpcCallLog().find((c) => c.method === "pull_ollama_models");
      expect(pullCall).toBeTruthy();
      expect(pullCall?.args[0]).toEqual(["qwen2.5:1.5b"]);
    });

    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Pull started", body: expect.stringContaining("qwen2.5:1.5b") })
    );
  });

  it("still starts the pull when the registry check itself throws", async () => {
    setRpcHandler("fetch_ollama_catalog_metadata", () => {
      throw new Error("network down");
    });

    const { container } = renderModal();
    openCustomTagFieldAndType(container, "qwen2.5:1.5b");

    const btn = container.querySelector('[aria-label="Pull custom model tag"]') as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(false));
    fireEvent.click(btn);

    await waitFor(() => {
      const pullCall = getRpcCallLog().find((c) => c.method === "pull_ollama_models");
      expect(pullCall).toBeTruthy();
      expect(pullCall?.args[0]).toEqual(["qwen2.5:1.5b"]);
    });

    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Pull started", body: expect.stringContaining("qwen2.5:1.5b") })
    );
  });
});

describe("findUnavailableRegistryTags", () => {
  it("flags nothing when the check could not reach the registry (offline)", () => {
    expect(findUnavailableRegistryTags(["qwen2.5vl:3b"], { source: "offline", tags: {} })).toEqual([]);
    expect(findUnavailableRegistryTags(["qwen2.5vl:3b"], null)).toEqual([]);
  });

  it("flags a live-checked tag the registry does not publish", () => {
    const meta = { source: "live" as const, tags: { "made-up-model:latest": { exists: false } } };
    expect(findUnavailableRegistryTags(["made-up-model:latest"], meta)).toEqual(["made-up-model:latest"]);
  });

  it("does not flag a live-checked tag the registry confirms exists", () => {
    const meta = { source: "live" as const, tags: { "qwen2.5vl:3b": { exists: true, size_bytes: 3_200_000_000 } } };
    expect(findUnavailableRegistryTags(["qwen2.5vl:3b"], meta)).toEqual([]);
  });

  it("flags a tag missing from the live response entirely, same as the back end's own check", () => {
    const meta = { source: "live" as const, tags: {} };
    expect(findUnavailableRegistryTags(["untested-tag"], meta)).toEqual(["untested-tag"]);
  });
});

describe("PullModelsModal 'Pull selected' names a tag the registry does not have", () => {
  function selectByLabel(container: HTMLElement, label: string) {
    const btn = container.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
  }

  it("starts the pull without the missing name and says which one it could not find", async () => {
    setRpcHandler("fetch_ollama_catalog_metadata", () => ({
      source: "live",
      tags: {
        "qwen2.5vl:3b": { exists: true, size_bytes: 3_200_000_000 },
        "qwen3.5:4b": { exists: false },
      },
    }));

    let footerState: { okText: string; onOk: () => void; okDisabled: boolean } | null = null;
    const { container } = renderModal({
      onFooterStateChange: (state) => {
        footerState = state;
      },
    });

    selectByLabel(container, "Select qwen2.5vl:3b to pull");
    selectByLabel(container, "Select qwen3.5:4b to pull");

    await waitFor(() => {
      expect(footerState?.okDisabled).toBe(false);
    });

    footerState!.onOk();

    await waitFor(() => {
      const pullCall = getRpcCallLog().find((c) => c.method === "pull_ollama_models");
      expect(pullCall).toBeTruthy();
      expect(pullCall?.args[0]).toEqual(["qwen2.5vl:3b"]);
    });

    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Pull started",
        body: expect.stringContaining("Could not find: qwen3.5:4b"),
      })
    );
  });

  it("pulls every selected tag with no mention of a missing one when the registry confirms them all", async () => {
    setRpcHandler("fetch_ollama_catalog_metadata", () => ({
      source: "live",
      tags: {
        "qwen2.5vl:3b": { exists: true, size_bytes: 3_200_000_000 },
        "qwen3.5:4b": { exists: true, size_bytes: 3_400_000_000 },
      },
    }));

    let footerState: { okText: string; onOk: () => void; okDisabled: boolean } | null = null;
    const { container } = renderModal({
      onFooterStateChange: (state) => {
        footerState = state;
      },
    });

    selectByLabel(container, "Select qwen2.5vl:3b to pull");
    selectByLabel(container, "Select qwen3.5:4b to pull");

    await waitFor(() => {
      expect(footerState?.okDisabled).toBe(false);
    });

    footerState!.onOk();

    await waitFor(() => {
      const pullCall = getRpcCallLog().find((c) => c.method === "pull_ollama_models");
      expect(pullCall).toBeTruthy();
      expect(pullCall?.args[0]).toEqual(["qwen2.5vl:3b", "qwen3.5:4b"]);
    });

    expect(toaster.toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining("Could not find") })
    );
  });
});

describe("PullModelsModal 'Use for Ask' pin", () => {
  it("shows the hollow star for an installed model with no saved try-order yet", async () => {
    setInstalledModels(["qwen2.5:1.5b"]);
    const { container } = renderModal();
    showAllGroups(container);
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Use qwen2.5:1.5b for Ask"]')).not.toBeNull();
    });
  });

  it("shows the filled star immediately for whichever tag is already first in the saved text try-order", async () => {
    setInstalledModels(["qwen2.5:1.5b"]);
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      text_model_routing_order: ["qwen2.5:1.5b"],
    }));
    const { container } = renderModal();
    showAllGroups(container);
    await waitFor(() => {
      expect(container.querySelector('[aria-label="qwen2.5:1.5b is used for Ask"]')).not.toBeNull();
    });
  });

  it("pressing the pin button saves this tag to the front of the text try-order and shows a confirmation", async () => {
    setInstalledModels(["qwen2.5:1.5b", "llama3.2:3b"]);
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      text_model_routing_order: ["llama3.2:3b"],
    }));
    const { container } = renderModal();
    showAllGroups(container);

    const pinBtn = await waitFor(() => {
      const el = container.querySelector('[aria-label="Use qwen2.5:1.5b for Ask"]');
      expect(el).not.toBeNull();
      return el as HTMLButtonElement;
    });

    fireEvent.click(pinBtn);

    await waitFor(() => {
      expect(container.querySelector('[aria-label="qwen2.5:1.5b is used for Ask"]')).not.toBeNull();
    });

    const saveCall = getRpcCallLog().find((c) => c.method === "save_settings");
    expect(saveCall).toBeTruthy();
    const payload = saveCall?.args[0] as { text_model_routing_order?: string[]; vision_model_routing_order?: unknown };
    expect(payload.text_model_routing_order).toEqual(["qwen2.5:1.5b", "llama3.2:3b"]);
    expect(payload.vision_model_routing_order).toBeUndefined();

    expect(toaster.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Now used for Ask", body: "qwen2.5:1.5b" })
    );
  });

  it("also pins the vision try-order when the model is a catalog vision entry", async () => {
    // qwen2.5vl:3b carries the "vision" tag in the bundled catalog.
    setInstalledModels(["qwen2.5vl:3b"]);
    const { container } = renderModal();

    const pinBtn = await waitFor(() => {
      const el = container.querySelector('[aria-label="Use qwen2.5vl:3b for Ask"]');
      expect(el).not.toBeNull();
      return el as HTMLButtonElement;
    });

    fireEvent.click(pinBtn);

    await waitFor(() => {
      const saveCall = getRpcCallLog().find((c) => c.method === "save_settings");
      expect(saveCall).toBeTruthy();
    });

    const saveCall = getRpcCallLog().find((c) => c.method === "save_settings");
    const payload = saveCall?.args[0] as { text_model_routing_order?: string[]; vision_model_routing_order?: string[] };
    expect(payload.text_model_routing_order).toEqual(["qwen2.5vl:3b"]);
    expect(payload.vision_model_routing_order).toEqual(["qwen2.5vl:3b"]);
  });

  it("pins a custom (uncatalogued) installed tag to text order only, not vision", async () => {
    setInstalledModels(["some-custom-tag:latest"]);
    const { container } = renderModal();

    const pinBtn = await waitFor(() => {
      const el = container.querySelector('[aria-label="Use some-custom-tag:latest for Ask"]');
      expect(el).not.toBeNull();
      return el as HTMLButtonElement;
    });

    fireEvent.click(pinBtn);

    await waitFor(() => {
      const saveCall = getRpcCallLog().find((c) => c.method === "save_settings");
      expect(saveCall).toBeTruthy();
    });

    const saveCall = getRpcCallLog().find((c) => c.method === "save_settings");
    const payload = saveCall?.args[0] as { text_model_routing_order?: string[]; vision_model_routing_order?: unknown };
    expect(payload.text_model_routing_order).toEqual(["some-custom-tag:latest"]);
    expect(payload.vision_model_routing_order).toBeUndefined();
  });
});

describe("PullModelsModal 'New' badge", () => {
  it("does not badge an already-installed model the very first time the picker has ever opened", async () => {
    window.localStorage.removeItem(PULL_MODEL_NEW_BADGE_STORAGE_KEY);
    setInstalledModels(["qwen2.5:1.5b"]);
    const { container, rerender } = renderModal();
    await waitFor(() => {
      expect(window.localStorage.getItem(PULL_MODEL_NEW_BADGE_STORAGE_KEY)).not.toBeNull();
    });
    rerender(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);
    expect(container.querySelector(".bonsai-pullmodels-new-badge")).toBeNull();
  });

  it("badges a tag recorded within the last 30 days", async () => {
    setInstalledModels(["qwen2.5:1.5b"]);
    window.localStorage.setItem(
      PULL_MODEL_NEW_BADGE_STORAGE_KEY,
      JSON.stringify({ "qwen2.5:1.5b": Date.now() - 1000 })
    );
    const { container } = renderModal();
    showAllGroups(container);
    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-new-badge")?.textContent).toBe("New");
    });
  });

  it("does not badge a tag recorded more than 30 days ago", async () => {
    setInstalledModels(["qwen2.5:1.5b"]);
    window.localStorage.setItem(
      PULL_MODEL_NEW_BADGE_STORAGE_KEY,
      JSON.stringify({ "qwen2.5:1.5b": Date.now() - PULL_MODEL_NEW_BADGE_WINDOW_MS - 5000 })
    );
    const { container } = renderModal();
    showAllGroups(container);
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Use qwen2.5:1.5b for Ask"]')).not.toBeNull();
    });
    expect(container.querySelector(".bonsai-pullmodels-new-badge")).toBeNull();
  });
});

describe("PullModelsModal Expert (large) group visibility", () => {
  it("shows the Expert (large) group, stretch entries included, once Essentials only is off", async () => {
    // Found while wiring the Expert group's bake-off order (docs/planning/41-deck-model-survey.md
    // § 9, D73): filteredCatalog dropped every "stretch" entry no matter how the Essentials-only
    // toggle was set -- toggle on excluded anything that was not "essentials", toggle off excluded
    // anything that was not "daily", and "daily" itself meant "not stretch". No setting could ever
    // show the group at all.
    setInstalledModels([]);
    const { container } = renderModal();
    showAllGroups(container);

    await waitFor(() => {
      expect(container.textContent).toContain("Expert (large)");
    });
    expect(container.querySelector('[aria-label="Select gemma4:12b-it-qat to pull"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Select qwen2.5:14b to pull"]')).not.toBeNull();
  });
});
