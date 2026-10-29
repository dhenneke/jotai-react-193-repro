import { act, cleanup, render, screen } from "@testing-library/react";
import { Suspense, use } from "react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("reproduces the conditional-use warning without Jotai", async () => {
  const initialPromise = Promise.resolve("Initial value");
  const consoleError = vi.spyOn(console, "error");

  function Reader({ value }) {
    const resolvedValue =
      typeof value?.then === "function" ? use(value) : value;
    return <output>{resolvedValue}</output>;
  }

  let view;
  await act(async () => {
    view = render(
      <Suspense fallback="Loading">
        <Reader value={initialPromise} />
      </Suspense>,
    );
    await initialPromise;
  });
  expect(screen.getByText("Initial value")).toBeTruthy();

  await act(async () => {
    view.rerender(
      <Suspense fallback="Loading">
        <Reader value="Plain value" />
      </Suspense>,
    );
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
