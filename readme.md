# @papack/ssr

Minimal server-side rendering framework with JSX-to-string rendering.

## Core Idea

- JSX rendered directly to HTML strings
- Components can be async
- No client-side JavaScript required
- No state, no reactivity, no hydration
- Every route is a plain function
- Built on Node.js `http`
- Optional TTL-based response caching

This is **SSR only**. request -> render -> response.

## Install

```bash
npm install @papack/ssr
```

## Quick Start

```ts
import { Router } from "@papack/ssr";

const router = new Router({
  siteName: "Example",
});

router.html({ path: "/" }, (ctx) => {
  return <h1>{ctx.siteName}</h1>;
});

router.listen(3000);
```

## Routing

### HTML

```ts
router.html({ path: "/product/:id" }, (ctx) => {
  return <h1>Product {ctx.params.id}</h1>;
});
```

- Returns HTML
- `<!DOCTYPE html>` is added automatically
- `Content-Type: text/html; charset=utf-8`

### CSS

```ts
router.css({ path: "/styles/main.css" }, () => {
  return `
    body { font-family: system-ui; }
  `;
});
```

- Returns plain strings
- `Content-Type: text/css; charset=utf-8`

### JavaScript

```ts
router.js({ path: "/scripts/app.js" }, () => {
  return `console.log("loaded");`;
});
```

## Params

```ts
router.html({ path: "/blog/:slug" }, (ctx) => {
  return <h1>{ctx.params.slug}</h1>;
});
```

## Context (ctx)

```ts
const router = new Router({
  db,
  version: "1.0",
});
```

```ts
(ctx) => {
  ctx.req; // IncomingMessage
  ctx.res; // ServerResponse
};
```

## JSX Rendering

### Async Components

```ts
async function User({ id }) {
  const user = await db.getUser(id);
  return <p>{user.name}</p>;
}
```

### `<For />`

```tsx
<For each={items}>{(item) => <li>{item}</li>}</For>
```

- Single render function
- No keys
- No diffing
- SSR-only

### `<Show />`

```tsx
<Show when={loggedIn}>
  <Dashboard />
</Show>
```

## Error Handling

### 404

```ts
router.notFound(() => {
  return <h1>Not Found</h1>;
});
```

### 500

```ts
router.error((ctx, err) => {
  return (
    <>
      <h1>Error</h1>
      <pre>{String(err)}</pre>
    </>
  );
});
```

## TTL Cache (Optional)

```ts
router.html({ path: "/", ttl: 5000 }, () => {
  return <h1>Cached</h1>;
});
```

- Per-route in-memory cache
- Cache key includes route params
- TTL in milliseconds

## Cookies / Headers

```ts
router.html({ path: "/login" }, (ctx) => {
  ctx.res.setHeader("Set-Cookie", "session=abc; Path=/; HttpOnly");

  return "ok";
});
```
