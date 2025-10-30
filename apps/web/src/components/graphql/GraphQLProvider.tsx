import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloLink,
  from,
} from "@apollo/client";
import { Observable } from "@apollo/client/utilities";
import { ApolloProvider } from "@apollo/client/react";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import { beginLogin, getTokens } from "../../lib/auth/flow";
import { appsyncUrl } from "../../lib/graphql/config";

interface ApolloResources {
  client: ApolloClient;
}

const GRAPHQL_LOGS_ENABLED = (() => {
  const flag = import.meta.env.PUBLIC_ENABLE_GRAPHQL_LOGS;
  if (typeof flag === "string") {
    const normalized = flag.trim().toLowerCase();
    return ["true", "1", "yes", "on"].includes(normalized);
  }
  return import.meta.env.DEV;
})();

const createApolloResources = (idToken: string): ApolloResources => {
  const formatDebugPayload = (payload: unknown) => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  const debugLink = new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      if (!forward) {
        observer.complete();
        return () => undefined;
      }

      if (GRAPHQL_LOGS_ENABLED) {
        console.debug(
          "[GraphQL] Request",
          formatDebugPayload({
            operationName: operation.operationName,
            variables: operation.variables,
          })
        );
      }

      const subscription = forward(operation).subscribe({
        next: (result) => {
          if (GRAPHQL_LOGS_ENABLED) {
            console.debug(
              "[GraphQL] Response",
              formatDebugPayload({
                operationName: operation.operationName,
                data: result.data,
                errors: result.errors,
              })
            );
          }
          observer.next(result);
        },
        error: (networkError: unknown) => {
          if (GRAPHQL_LOGS_ENABLED) {
            console.debug(
              "[GraphQL] Error",
              formatDebugPayload({
                operationName: operation.operationName,
                error: networkError,
              })
            );
          }
          observer.error(networkError);
        },
        complete: () => {
          observer.complete();
        },
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  });

  const httpLink = new HttpLink({
    uri: appsyncUrl,
    headers: {
      Authorization: idToken,
    },
  });

  const link = GRAPHQL_LOGS_ENABLED
    ? from([debugLink, httpLink])
    : from([httpLink]);

  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });

  return { client };
};

function useApolloClient(): {
  resource: ApolloResources | null;
  error: string | null;
} {
  const [resource, setResource] = useState<ApolloResources | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initialize = async (): Promise<void> => {
      try {
        const tokens = await getTokens();
        if (!tokens) {
          beginLogin().catch((err) => {
            if (cancelled) {
              return;
            }
            const message =
              err instanceof Error
                ? err.message
                : "Unable to start Google sign-in.";
            setError(message);
          });
          return;
        }

        if (cancelled) {
          return;
        }

        const resources = createApolloResources(tokens.idToken);
        setResource(resources);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : "Failed to create GraphQL client.";
        setError(message);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  return { resource, error };
}

interface GraphQLProviderProps {
  children: ComponentProps<typeof ApolloProvider>["children"];
  fallback?: ReactNode;
}

export function GraphQLProvider({
  children,
  fallback,
}: GraphQLProviderProps): JSX.Element {
  const { resource, error } = useApolloClient();

  const fallbackContent = fallback ?? null;

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (!resource) {
    return <>{fallbackContent}</>;
  }
  return <ApolloProvider client={resource.client}>{children}</ApolloProvider>;
}
