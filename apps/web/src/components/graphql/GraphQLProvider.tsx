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
import { beginLogin, getTokens, signOut } from "../../lib/auth/flow";
import { appsyncUrl } from "../../lib/graphql/config";

interface ApolloResources {
  client: ApolloClient;
}

const createApolloResources = (idToken: string): ApolloResources => {
  const formatDebugPayload = (payload: unknown) => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch (_err) {
      return String(payload);
    }
  };

  const debugLink = new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      if (!forward) {
        observer.complete();
        return () => undefined;
      }

      if (process.env.NODE_ENV !== "production") {
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
          if (process.env.NODE_ENV !== "production") {
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
        error: (networkError) => {
          if (process.env.NODE_ENV !== "production") {
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

  const client = new ApolloClient({
    link: from([debugLink, httpLink]),
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
    const tokens = getTokens();
    if (!tokens || tokens.expiresAt <= Date.now()) {
      signOut();
      beginLogin().catch((err) => {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to start Google sign-in.";
        setError(message);
      });
      return undefined;
    }

    try {
      const resources = createApolloResources(tokens.idToken);
      setResource(resources);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create GraphQL client.";
      setError(message);
    }

    return undefined;
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
