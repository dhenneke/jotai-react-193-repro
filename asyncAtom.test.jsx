import { act, cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { Provider, atom, createStore, useAtomValue } from "jotai";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("warns when a suspended async atom later returns a plain value", async () => {
  const store = createStore();
  const modeAtom = atom("async");
  const initialPromise = Promise.resolve("Initial value");
  const valueAtom = atom((get) =>
    get(modeAtom) === "async" ? initialPromise : "Plain value",
  );
  const consoleError = vi.spyOn(console, "error");

  function Reader() {
    return <output>{useAtomValue(valueAtom)}</output>;
  }

  await act(async () => {
    render(
      <Provider store={store}>
        <Suspense fallback="Loading">
          <Reader />
        </Suspense>
      </Provider>,
    );
    await initialPromise;
  });
  expect(screen.getByText("Initial value")).toBeTruthy();

  await act(async () => {
    store.set(modeAtom, "plain");
  });
  expect(screen.getByText("Plain value")).toBeTruthy();

  const loggedErrors = consoleError.mock.calls
    .flat()
    .map((argument) =>
      argument instanceof Error ? argument.message : String(argument),
    )
    .join("\n");
  expect(loggedErrors).toContain(
    "This library called use() to suspend in a previous render but did not call use() when it finished.",
  );
});
