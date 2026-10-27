# Jotai async atom / React 19.3 repro

A minimal Vitest + JSX component test reproducing React 19.3's development
warning when Jotai `useAtomValue` suspends on a promise and later reads a plain
value.

## Related issue

Related discussion: [pmndrs/jotai#3381](https://github.com/pmndrs/jotai/discussions/3381)

## Run

```sh
pnpm install
pnpm test
```

The test mounts a component reading an async atom under `Suspense`. After the
promise resolves and the initial value commits, it updates the same atom to a
plain value in a separate `act()` call.

React emits this exact message through `console.error` during the plain-value
update:

```text
This library called use() to suspend in a previous render but did not call use() when it finished. This indicates an incorrect use of use(). Learn more: https://react.dev/warnings/conditional-use-of-use
```

## Timing

```mermaid
sequenceDiagram
    actor Test as Vitest test
    participant Act as React act()
    participant Store as Jotai store
    participant Reader as Reader component
    participant React as React DOM and Suspense
    participant Console as console.error

    Test->>Act: Render Reader inside Provider and Suspense
    Act->>Reader: Initial render
    Reader->>Store: useAtomValue(valueAtom)
    Store-->>Reader: Promise.resolve("Initial value")
    Reader->>React: React.use(promise)
    React-->>Test: Suspend and show "Loading"
    Test->>Act: Await initialPromise
    Act->>React: Retry suspended render
    React->>Reader: Render again
    Reader->>Store: useAtomValue(valueAtom)
    Store-->>Reader: Same resolved promise
    Reader->>React: React.use(promise) returns "Initial value"
    React-->>Test: Commit "Initial value", then complete the first act

    Test->>Act: Separate act(() => store.set(modeAtom, "plain"))
    Act->>Store: Set mode to plain
    Store-->>Reader: Notify atom subscriber
    Reader->>Store: useAtomValue(valueAtom)
    Store-->>Reader: "Plain value"
    Note over Reader,React: This render skips React.use() after the earlier suspended render
    React->>Console: Emit conditional-use warning
    React-->>Test: Commit "Plain value"
```

## Versions

- React / React DOM: `19.3.0`
- Jotai: `3.0.1`
- Vitest: `5.0.5`
- React Testing Library: `16.3.3`
- jsdom: `30.1.3`
- `pnpm-lock.yaml` locks the dependency tree.
