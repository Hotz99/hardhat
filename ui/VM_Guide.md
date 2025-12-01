# Effect Atom View Model Pattern Guide

This guide explains the View Model (VM) pattern as implemented in this codebase using Effect Atom - a reactive state management library built on top of Effect.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [VM Interface Design](#vm-interface-design)
3. [VM Implementation with Layers](#vm-implementation-with-layers)
4. [Reactive Primitives](#reactive-primitives)
5. [Testing VMs](#testing-vms)
6. [React Integration](#react-integration)
7. [VM Composition](#vm-composition)
8. [Cross-VM Communication with PubSub](#cross-vm-communication-with-pubsub)

---

## Core Concepts

The VM pattern separates **business logic** (what your app does) from **view concerns** (how it looks). This separation provides:

1. **Testability**: Business logic can be tested without rendering UI
2. **Clarity**: Clear boundaries make code easier to reason about
3. **AI-friendliness**: Agents can work on logic without tangling with UI noise

### Key Building Blocks

| Concept | Purpose | Effect Atom Type |
|---------|---------|------------------|
| **Atom** | Read-only reactive value | `Atom.Atom<A>` |
| **Writable** | Read-write reactive value | `Atom.Writable<R, W>` |
| **Context.Tag** | Service identifier for DI | `Context.GenericTag<T>` |
| **Layer** | Service implementation + dependencies | `Layer.Layer<T, E, R>` |
| **Registry** | Atom state container | `AtomRegistry` |

---

## VM Interface Design

A VM interface defines the contract between UI and business logic. All reactive fields use `Atom.Atom<T>` or `Atom.Writable<T>` types with a `$` suffix convention.

### Rules for VM Interfaces

1. **Reactive fields end with `$`** - Signals that the value may change
2. **Actions are plain functions returning `void`** - Side effects are opaque to the view
3. **Return UI-ready data** - Format dates, localize strings before reaching the UI
4. **Never expose raw IDs to UI** - Use `key` for React keys, close over IDs in callbacks

### Example: TodoItemVM Interface

```typescript
// lib/features/todos/TodoItemVM.ts
import type * as Atom from "@effect-atom/atom/Atom";

export interface TodoItemVM {
  readonly id: string;                    // key for React, not for business logic
  readonly text$: Atom.Atom<string>;      // reactive text
  readonly completed$: Atom.Atom<boolean>; // reactive completion state
  readonly toggle: () => void;            // action - opaque side effect
  readonly remove: () => void;            // action - opaque side effect
}
```

### Example: TodoVM Interface

```typescript
// lib/features/todos/TodoVM.ts
export interface TodoVM {
  // Reactive state
  readonly todos$: Atom.Atom<Loadable.Loadable<TodoItemVM[]>>;
  readonly newTodoText$: Atom.Writable<string>;  // Writable = user can modify
  readonly totalCount$: Atom.Atom<number>;
  readonly completedCount$: Atom.Atom<number>;
  readonly activeCount$: Atom.Atom<number>;
  readonly statusDisplay$: Atom.Atom<string>;    // UI-ready formatted string

  // Actions
  readonly addTodo: () => void;
  readonly clearCompleted: () => void;
}

// Context.Tag for dependency injection
export const TodoVM = Context.GenericTag<TodoVM>("TodoVM");
```

---

## VM Implementation with Layers

VMs are implemented as Effect Layers, enabling:

- Dependency injection
- Scoped lifecycle management
- Testable service composition

### Layer Structure

```typescript
const TodoVMLayer = Layer.effect(
  TodoVM,                              // Tag to provide
  Effect.gen(function* () {
    // 1. Acquire dependencies
    const registry = yield* Registry.AtomRegistry;
    const services = yield* TodoServices;

    // 2. Create atoms (state)
    const todosState$ = Atom.make<Loadable<Todo[]>>(Loadable.pending());
    const newTodoText$ = Atom.make("");

    // 3. Create derived atoms (computed values)
    const totalCount$ = pipe(
      todosState$,
      Atom.map(Loadable.match({
        onPending: () => 0,
        onReady: (t) => t.length
      }))
    );

    // 4. Create actions (closures over atoms + registry)
    const addTodo = () => {
      const text = registry.get(newTodoText$);
      if (text.length === 0) return;
      // ... mutation logic
    };

    // 5. Start background processes (scoped to VM lifetime)
    yield* Effect.forkScoped(
      pipe(
        Registry.toStream(registry, todosState$),
        Stream.tap((todos) => services.save(todos)),
        Stream.runDrain
      )
    );

    // 6. Return the VM interface
    return {
      todos$,
      newTodoText$,
      totalCount$,
      addTodo,
      // ...
    };
  })
);
```

### Exporting the VM

Bundle the tag and layer together for easy consumption:

```typescript
export const TodoVMLive = {
  tag: TodoVM,
  layer: TodoVMLayer
};
```

---

## Reactive Primitives

### Creating Atoms

```typescript
// Simple state atom (writable)
const count$ = Atom.make(0);

// Derived atom (read-only, computed from other atoms)
const doubled$ = Atom.make((get) => get(count$) * 2);

// Derived with pipe
const isPositive$ = pipe(count$, Atom.map((n) => n > 0));

// Async atom (returns Result<A, E>)
const data$ = Atom.make(
  Effect.gen(function* () {
    const service = yield* SomeService;
    return yield* service.fetchData();
  })
);
```

### Reading and Writing Atoms

```typescript
// In VM implementation (using registry directly)
const registry = yield* Registry.AtomRegistry;

// Read
const value = registry.get(count$);

// Write
registry.set(count$, 42);

// Update
registry.set(count$, registry.get(count$) + 1);
```

### Atom.family - Memoized VM Factories

Create memoized sub-VMs for list items:

```typescript
const makeTodoItemVM = Atom.family((todo: Todo): TodoItemVM => {
  const text$ = pipe(
    todosState$,
    Atom.map(Loadable.match({
      onPending: () => todo.text,
      onReady: (todos) => todos.find((t) => t.id === todo.id)?.text ?? todo.text,
    }))
  );

  const toggle = () => {
    // Close over todo.id - UI never sees it
    registry.set(todosState$, Loadable.map(current,
      Array.map((t) => t.id === todo.id ? { ...t, completed: !t.completed } : t)
    ));
  };

  return { id: todo.id, text$, completed$, toggle, remove };
});
```

---

## Testing VMs

VMs are tested without any UI - just atoms and actions.

### Test Setup Pattern

```typescript
import { describe, it, expect } from "vitest";
import * as Registry from "@effect-atom/atom/Registry";
import { Context, Effect, Layer } from "effect";

describe("TodoVM", () => {
  // Factory that creates a fresh VM for each test
  const makeVM = () => {
    const r = Registry.make();
    const vm = Layer.build(TodoVMLive.layer).pipe(
      Effect.map((ctx) => Context.get(ctx, TodoVMLive.tag)),
      Effect.scoped,
      Effect.provideService(Registry.AtomRegistry, r),
      Effect.runSync
    );
    return { r, vm };
  };

  it("should start with empty todos", () => {
    const { r, vm } = makeVM();
    const count = r.get(vm.totalCount$);
    expect(count).toBe(0);
  });

  it("should add a todo", () => {
    const { r, vm } = makeVM();

    // Set input
    r.set(vm.newTodoText$, "Buy milk");

    // Trigger action
    vm.addTodo();

    // Assert state
    const todos = r.get(vm.todos$);
    expect(Loadable.isReady(todos)).toBe(true);
    expect(todos.value.length).toBe(1);
  });
});
```

### Testing Derived State

```typescript
it("should compute counts correctly", () => {
  const { r, vm } = makeVM();

  // Add todos
  r.set(vm.newTodoText$, "Task 1");
  vm.addTodo();
  r.set(vm.newTodoText$, "Task 2");
  vm.addTodo();

  // Check derived atoms
  expect(r.get(vm.totalCount$)).toBe(2);
  expect(r.get(vm.activeCount$)).toBe(2);
  expect(r.get(vm.completedCount$)).toBe(0);

  // Toggle one todo
  const todos = r.get(vm.todos$);
  todos.value[0].toggle();

  expect(r.get(vm.completedCount$)).toBe(1);
  expect(r.get(vm.activeCount$)).toBe(1);
});
```

---

## React Integration

### RegistryProvider

Wrap your app with `RegistryProvider` to provide the atom registry context:

```tsx
// app/page.tsx
import { RegistryProvider } from "@effect-atom/atom-react";

export default function Home() {
  return (
    <RegistryProvider>
      <TodoList />
      <StatsPanel />
    </RegistryProvider>
  );
}
```

### useVM Hook

The custom `useVM` hook lazily builds and caches VM layers:

```typescript
// app/runtime.ts
export const useVM = <Id, Value, E>(self: {
  tag: Context.Tag<Id, Value>,
  layer: Layer.Layer<Id, E, Scope.Scope | AtomRegistry>
}): Result.Result<Value, E> => {
  const key = makeVmKey(self.tag, self.layer);
  return useAtomValue(vmAtom(key));
};
```

### Component Pattern

```tsx
// components/TodoList.tsx
"use client";

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react";
import { useVM } from "@/app/runtime";
import { TodoVMLive } from "@/lib/features/todos/TodoVM";
import * as Result from "@effect-atom/atom/Result";

// Inner component receives the resolved VM
function TodoListContent({ vm }: { vm: TodoVM }) {
  const todos = useAtomValue(vm.todos$);
  const newText = useAtomValue(vm.newTodoText$);
  const setNewText = useAtomSet(vm.newTodoText$);

  return (
    <div>
      <input
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && vm.addTodo()}
      />
      {Loadable.match(todos, {
        onPending: () => <Spinner />,
        onReady: (items) => items.map((item) => (
          <TodoItem key={item.id} item={item} />
        ))
      })}
    </div>
  );
}

// Outer component handles VM loading state
export function TodoList() {
  const vmResult = useVM(TodoVMLive);

  return pipe(
    vmResult,
    Result.match({
      onInitial: () => <Loading />,
      onSuccess: ({ value: vm }) => <TodoListContent vm={vm} />,
      onFailure: ({ cause }) => <Error cause={cause} />,
    })
  );
}
```

### React Hooks Reference

| Hook | Purpose |
|------|---------|
| `useAtomValue(atom$)` | Subscribe to atom value |
| `useAtomSet(atom$)` | Get setter function for writable atom |
| `useAtom(atom$)` | Get `[value, setter]` tuple |
| `useAtomMount(atom$)` | Ensure atom stays mounted |
| `useAtomRefresh(atom$)` | Get function to refresh atom |

---

## VM Composition

VMs can depend on other VMs through Effect's dependency injection.

### Dependent VM Pattern

```typescript
// StatsVM depends on TodoVM and HistoryVM
const StatsVMLayer = Layer.effect(
  StatsVM,
  Effect.gen(function* () {
    const todoVM = yield* TodoVM;      // Dependency
    const historyVM = yield* HistoryVM; // Dependency

    // Derive from other VMs' atoms
    const completionRate$ = Atom.make((get) => {
      const total = get(todoVM.totalCount$);
      const completed = get(todoVM.completedCount$);
      return total === 0 ? 0 : completed / total;
    });

    return { completionRate$, /* ... */ };
  })
);
```

### Composing Layers for Components

```typescript
// components/StatsPanel.tsx
const StatsVMComposed = {
  tag: StatsVMLive.tag,
  layer: StatsVMLive.layer.pipe(
    Layer.provide(TodoVMLive.layer),
    Layer.provide(HistoryVMLive.layer),
  ),
};

export function StatsPanel() {
  const vmResult = useVM(StatsVMComposed);
  // ...
}
```

---

## Cross-VM Communication with PubSub

Use Effect's PubSub for event-driven communication between VMs.

### Define Shared Event Types

```typescript
// lib/features/TodoEvent.ts
import { Context, Effect, PubSub } from "effect";

export interface TodoEvent {
  readonly type: "created" | "completed" | "uncompleted" | "deleted";
  readonly todoId: string;
  readonly todoText: string;
}

// Context.Reference provides a default value (sliding buffer of 16)
export class TodoEventPubSub extends Context.Reference<TodoEventPubSub>()(
  "TodoEventPubSub",
  { defaultValue: () => Effect.runSync(PubSub.sliding<TodoEvent>(16)) }
) {}
```

### Publishing Events

```typescript
// In TodoVM
const eventPubSub = yield* TodoEventPubSub;

const toggle = () => {
  const wasCompleted = /* ... */;
  // ... state update ...
  Effect.runSync(PubSub.publish(eventPubSub, {
    type: wasCompleted ? "uncompleted" : "completed",
    todoId: todo.id,
    todoText: todo.text,
  }));
};
```

### Subscribing to Events

```typescript
// In HistoryVM
const HistoryVMLayer = Layer.scoped(
  HistoryVM,
  Effect.gen(function* () {
    const eventPubSub = yield* TodoEventPubSub;
    const events$ = Atom.make<HistoryEvent[]>([]);

    //registry.toStream(events$) is an even better idea to get a stream if only caring about changes to the events

    // Background subscription to events
    yield* Effect.forkScoped(
      pipe(
        Stream.fromPubSub(eventPubSub),
        Stream.tap((event) => Effect.sync(() => {
          registry.set(events$, [...registry.get(events$), {
            ...event,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          }]);
        })),
        Stream.runDrain
      )
    );

    return { events$, /* ... */ };
  })
);
```

---

## Best Practices Summary

1. **Suffix reactive fields with `$`** - `text$`, `completed$`, `todos$`
2. **Actions return `void`** - Keep side effects opaque to the view
3. **Format data before the UI** - Return `statusDisplay: "3 items left"` not `count: 3`
4. **Close over IDs in callbacks** - UI uses `key` for React, never raw IDs
5. **Use `Atom.family` for list items** - Memoizes sub-VMs efficiently
6. **Test VMs without UI** - Use registry directly, assert atom values
7. **Compose VMs via Layer dependencies** - `yield* OtherVM` in implementation
8. **Use PubSub for cross-cutting events** - Decouples VMs while enabling communication
9. **Use `Layer.scoped` for VMs with background processes** - Proper cleanup on unmount
10. **Export `{ tag, layer }` objects** - Easy to use with `useVM` hook

---

## File Structure Convention

```
lib/features/
  TodoEvent.ts           # Shared event types + PubSub
  todos/
    Todo.ts              # Domain model (Schema)
    TodoItemVM.ts        # Child VM interface
    TodoVM.ts            # Parent VM interface + implementation
    TodoVM.test.ts       # VM tests
  filter/
    FilterVM.ts          # Depends on TodoVM
    FilterVM.test.ts
  history/
    HistoryVM.ts         # Subscribes to TodoEventPubSub
    HistoryVM.test.ts
```

---

## Loadable Pattern

The codebase uses a custom `Loadable<A>` type for async data:

```typescript
type Loadable<A> = Pending | Ready<A>

interface Pending {
  readonly _tag: "Pending"
  readonly since: DateTime.Utc
}

interface Ready<A> {
  readonly _tag: "Ready"
  readonly value: A
}
```

This differs from Effect's `Result` by:

- No error channel (errors are handled at the Effect level)
- Tracks loading start time for staleness detection
- Simpler API for UI loading states

Use `Loadable.match` for exhaustive handling:

```typescript
Loadable.match(todosLoadable, {
  onPending: (since) => <Spinner since={since} />,
  onReady: (todos) => <TodoList todos={todos} />
})
```
