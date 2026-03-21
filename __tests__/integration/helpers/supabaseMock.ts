import { vi } from "vitest";

type QueryResult = { data: unknown; error: unknown; count?: number | null };

/**
 * Creates a Proxy-based chainable Supabase client mock.
 * Any method call on the query builder returns `this` (proxy),
 * and the result is resolved when awaited (via `.then()`).
 *
 * Use `setResult(table, result)` to configure what each table query returns.
 */
export function createSupabaseMock() {
  const results = new Map<string, QueryResult>();
  let currentTable = "";

  function createQueryProxy(table: string): unknown {
    currentTable = table;
    const getResult = () => results.get(currentTable) ?? { data: null, error: null };

    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        if (prop === "then") {
          // Make it thenable — resolves to current result when awaited
          return (resolve: (v: unknown) => void) => resolve(getResult());
        }
        // Any method call returns the proxy itself (chainable)
        return (..._args: unknown[]) => new Proxy({}, handler);
      },
    };

    return new Proxy({}, handler);
  }

  const functionsInvoke = vi.fn().mockResolvedValue({ error: null });

  const authGetUser = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  });

  const supabaseClient = {
    auth: { getUser: authGetUser },
    from: vi.fn().mockImplementation((table: string) => createQueryProxy(table)),
    functions: { invoke: functionsInvoke },
  };

  return {
    client: supabaseClient,
    functionsInvoke,

    /** Configure the result for queries on a specific table */
    setResult(table: string, result: Partial<QueryResult>) {
      results.set(table, { data: null, error: null, ...result });
    },

    /** Set the authenticated user */
    setUser(user: { id: string; email?: string } | null) {
      authGetUser.mockResolvedValue({
        data: { user },
        error: null,
      });
    },

    /** Reset all state */
    reset() {
      results.clear();
      authGetUser.mockResolvedValue({ data: { user: null }, error: null });
      supabaseClient.from.mockClear();
      functionsInvoke.mockClear();
    },
  };
}

/** Creates a FormData instance from a plain object */
export function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}
