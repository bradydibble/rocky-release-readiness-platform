# ADR 002: Frontend Framework Selection

**Status:** Proposed
**Date:** 2025-10-04
**Deciders:** CRAG Team
**Context:** Need to choose a frontend framework for CRAG web interface

## Context and Problem Statement

CRAG requires a modern, responsive web interface that:
- Works seamlessly on desktop and mobile devices
- Provides real-time updates for test results
- Offers excellent UX for test result submission and viewing
- Supports server-side rendering (SSR) for SEO and initial load performance
- Enables Progressive Web App (PWA) features for mobile testing
- Integrates cleanly with FastAPI backend

The framework should provide:
- Component-based architecture
- Type safety (TypeScript)
- Good developer experience
- Active ecosystem and community
- Mobile-first responsive design support

## Decision Drivers

1. **User Experience** - Intuitive, fast, mobile-friendly
2. **Development Velocity** - Rapid iteration to MVP
3. **Type Safety** - TypeScript support for correctness
4. **SSR Support** - Better SEO and initial load times
5. **Real-Time Updates** - WebSocket/SSE integration
6. **PWA Capability** - Offline support for mobile testers
7. **Community Support** - Active development, good documentation
8. **Contributor Access** - Common enough to find contributors

## Options Considered

### Option 1: React + Next.js

**Pros:**
- Largest ecosystem and community
- Next.js provides excellent SSR, routing, and API routes
- Huge number of component libraries (Radix UI, shadcn/ui, Mantine)
- Most developers have React experience
- Excellent TypeScript support
- Built-in PWA support via next-pwa
- Automatic code splitting and optimization
- Great developer tools (React DevTools)
- Vercel deployment option (though we'll likely self-host)

**Cons:**
- Larger bundle sizes than alternatives
- React's runtime overhead
- More boilerplate than newer frameworks
- Re-renders can be complex to optimize
- Need additional libraries for state management (Zustand, Jotai)

**Use Cases:**
- Netflix, Airbnb, Uber use React
- Many enterprise applications

**Example Code:**
```tsx
// app/testdays/[id]/page.tsx
export default async function TestRunPage({ params }: { params: { id: string } }) {
  const testrun = await fetch(`/api/testruns/${params.id}`).then(r => r.json())

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold">{testrun.name}</h1>
      <ResultsGrid testrun={testrun} />
    </div>
  )
}
```

### Option 2: SvelteKit

**Pros:**
- Compiled framework - no runtime, smallest bundles
- Extremely fast and reactive
- Built-in state management (stores)
- Excellent developer experience (less boilerplate)
- Native TypeScript support
- SSR and routing built-in
- Growing ecosystem
- Smooth animations and transitions out of the box
- True reactivity (no virtual DOM)

**Cons:**
- Smaller ecosystem than React (fewer component libraries)
- Less developer familiarity (harder to find contributors)
- Some libraries still catching up to React ecosystem
- Smaller job market (if team needs to hire)

**Use Cases:**
- Brave browser settings, Apple Music use Svelte
- Preferred by many for greenfield projects

**Example Code:**
```svelte
<!-- routes/testruns/[id]/+page.svelte -->
<script lang="ts">
  export let data: { testrun: TestRun }

  $: testrun = data.testrun
</script>

<div class="container mx-auto">
  <h1 class="text-3xl font-bold">{testrun.name}</h1>
  <ResultsGrid {testrun} />
</div>
```

### Option 3: Vue + Nuxt

**Pros:**
- Progressive framework (easy to learn)
- Excellent documentation
- Good balance between React and Svelte
- Nuxt provides SSR, routing, modules
- Strong TypeScript support (Vue 3)
- Composition API similar to React hooks
- Good component library ecosystem (Vuetify, PrimeVue)
- Single-file components (.vue) are intuitive

**Cons:**
- Middle ground in ecosystem size (smaller than React, larger than Svelte)
- Less common in enterprise (vs React)
- Some confusion between Vue 2/3 and Options/Composition API
- Smaller community than React

**Use Cases:**
- GitLab, Alibaba use Vue
- Popular in Asia, growing elsewhere

**Example Code:**
```vue
<!-- pages/testruns/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const { data: testrun } = await useFetch(`/api/testruns/${route.params.id}`)
</script>

<template>
  <div class="container mx-auto">
    <h1 class="text-3xl font-bold">{{ testrun.name }}</h1>
    <ResultsGrid :testrun="testrun" />
  </div>
</template>
```

## Decision Outcome

**Chosen Option: React + Next.js**

### Rationale

React with Next.js provides the best foundation for CRAG:

1. **Ecosystem Maturity** - Largest selection of component libraries and tools
2. **Contributor Access** - Most developers know React, easier to find help
3. **SSR & Routing** - Next.js App Router provides excellent SSR with simple API
4. **TypeScript Support** - First-class TypeScript integration
5. **Component Libraries** - Access to shadcn/ui, Radix UI, Mantine for rapid UI development
6. **Real-Time** - Easy WebSocket/SSE integration with React hooks
7. **PWA Support** - next-pwa plugin provides offline capabilities
8. **Future-Proof** - React Server Components provide performance benefits

### Alternative Considered

**SvelteKit was a close second** and would be an excellent choice for:
- Smaller bundle sizes (important for mobile)
- Better developer experience (less boilerplate)
- Faster initial renders

However, React's larger ecosystem and community outweigh these benefits for a project that needs contributors from the Rocky community.

### Component Library Choice

**shadcn/ui** for UI components:
- Copy-paste components (full control, no dependency)
- Built on Radix UI primitives (accessibility)
- Tailwind CSS for styling
- TypeScript first
- Customizable and themeable

## Implementation Details

### Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth layouts
│   │   ├── login/
│   │   └── profile/
│   ├── testruns/            # Test run pages
│   │   ├── [id]/
│   │   └── new/
│   ├── api/                 # API routes (proxy to FastAPI)
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── testrun/             # Test run specific
│   ├── results/             # Result components
│   └── layout/              # Layout components
├── lib/                     # Utilities
│   ├── api.ts              # API client
│   ├── hooks.ts            # Custom hooks
│   └── utils.ts            # Helpers
├── public/                  # Static assets
├── styles/                  # Global styles
└── package.json
```

### State Management

**React Query (TanStack Query)** for server state:
- Automatic caching and revalidation
- Optimistic updates
- Background refetching
- Perfect for our API-heavy app

**Zustand** for client state (if needed):
- Lightweight (1kb)
- Simple API
- No boilerplate

### Real-Time Updates

**Server-Sent Events (SSE)** for real-time result updates:
```tsx
useEffect(() => {
  const eventSource = new EventSource(`/api/testruns/${id}/stream`)

  eventSource.onmessage = (event) => {
    const result = JSON.parse(event.data)
    queryClient.setQueryData(['results', id], (old) => [...old, result])
  }

  return () => eventSource.close()
}, [id])
```

### Mobile PWA

**next-pwa** for Progressive Web App:
- Offline support
- Install prompt
- Background sync for result submission
- Service worker for caching

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // Next.js config
})
```

## Consequences

### Positive

- Large ecosystem provides solutions for most needs
- Easy to find React developers for contributions
- Excellent tooling and developer experience
- Mature SSR solution with Next.js
- Strong TypeScript support
- Many pre-built accessible components
- Good performance with React Server Components

### Negative

- Larger bundle sizes than Svelte
- More complex state management than Svelte
- Re-render optimization requires attention
- Framework churn (React evolving rapidly)

### Neutral

- Need to keep up with Next.js updates (App Router is recent)
- Multiple ways to do things (class vs function components, state management options)

## Validation

Success criteria after 2 months:
- [ ] Mobile-responsive UI works on iOS and Android
- [ ] Real-time result updates work reliably
- [ ] Lighthouse score: 90+ performance, 100 accessibility
- [ ] PWA installable on mobile devices
- [ ] Fast initial page load (<2s on 3G)

## Related Decisions

- ADR 001: Backend Framework Selection (FastAPI)
- ADR 005: Styling and Design System (Tailwind + shadcn/ui)

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
