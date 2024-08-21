# @ensdomains/ccip-read-router

A lightweight package for routing CCIP-Read requests, using [itty-router](https://itty.dev/itty-router/).

## Getting started

Install with:

```bash
bun add @ensdomains/ccip-read-router itty-router
```

### Basic usage

```typescript
import { CcipReadRouter } from "@ensdomains/ccip-read-router";

// 1. Create a router instance
const router = CcipReadRouter();

// 2. Add a route
router.add({
  // Function signature for the route
  type: "function bar(uint256) pure returns (uint256)",
  // Handler, with args based on function signature
  handle: async ([x]) => {
    // Return type based on function signature, or arbitrary hex (0x...)
    return [x * 2n];
  },
});

// 3. Consume the router...
```

### Customisation

Most customisation is inherited from [itty-router](https://itty.dev/itty-router/).

#### Base URL

```typescript
import { CcipReadRouter } from "@ensdomains/ccip-read-router";

const router = CcipReadRouter({ base: "/ccip-read" });
```

#### CORS

From itty-router [docs](https://itty.dev/itty-router/cors#cors-itty-router):

```typescript
import { CcipReadRouter } from "@ensdomains/ccip-read-router";
import { cors } from "itty-router";

// get preflight and corsify pair
const { preflight, corsify } = cors();

const router = CcipReadRouter({
  before: [preflight], // add preflight upstream
  finally: [corsify], // and corsify downstream
});
```

### Runtimes

#### Cloudflare Workers

Just export the router from your worker file.

```typescript
import { CcipReadRouter } from "@ensdomains/ccip-read-router";

const router = CcipReadRouter();

router.add({
  type: "function bar(uint256) pure returns (uint256)",
  handle: async ([x]) => {
    return [x * 2n];
  },
});

export default { ...router };
```

#### Bun

Initialise the router with the port you want to use, and export.

```typescript
import { CcipReadRouter } from "@ensdomains/ccip-read-router";

const router = CcipReadRouter({ port: 3001 });

router.add({
  type: "function bar(uint256) pure returns (uint256)",
  handle: async ([x]) => {
    return [x * 2n];
  },
});

export default router;
```

#### Node usage

Use the [@whatwg-node/server](https://www.npmjs.com/package/@whatwg-node/server) adapter.

```typescript
import { CcipReadRouter } from "@ensdomains/ccip-read-router";
import { createServerAdapter } from "@whatwg-node/server";
import { createServer } from "http";

const router = CcipReadRouter();

router.add({
  type: "function bar(uint256) pure returns (uint256)",
  handle: async ([x]) => {
    return [x * 2n];
  },
});

// create a @whatwg-node/server
const ccipReadServer = createServerAdapter(router.fetch);

// then pass that to Node
const httpServer = createServer(ccipReadServer);
httpServer.listen(3001);
```

### Other runtimes

See the [runtime guides](https://itty.dev/itty-router/guides/) section of the itty-router docs.
