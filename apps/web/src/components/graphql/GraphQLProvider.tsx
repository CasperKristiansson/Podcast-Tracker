import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import { beginLogin, getTokens, signOut } from "../../lib/auth/flow";
import { appsyncUrl } from "../../lib/graphql/config";

interface ApolloResources {
  client: ApolloClient;
}

const createApolloResources = (idToken: string): ApolloResources => {
  const httpLink = new HttpLink({
    uri: appsyncUrl,
    headers: {
      Authorization: idToken,
    },
  });

  const client = new ApolloClient({
    link: httpLink,
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

  const fallbackContent = fallback ?? (
    <div className="flex items-center justify-center">
      <div className="animate-pulse rounded-md bg-brand-surface/60 px-4 py-2 text-sm text-brand-muted">
        Connecting to AppSync…
      </div>
    </div>
  );

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
