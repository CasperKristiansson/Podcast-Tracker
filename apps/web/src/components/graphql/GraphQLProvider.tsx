import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { Kind, OperationTypeNode } from "graphql";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { createClient as createWsClient, type Client } from "graphql-ws";
import { getTokens, signOut } from "../../lib/auth/flow";
import {
  appsyncRealtimeHost,
  appsyncRealtimeUrl,
  appsyncUrl,
} from "../../lib/graphql/config";
import { isApiReady, isAuthReady } from "../../lib/flags";

interface ApolloResources {
  client: ApolloClient;
  ws: Client;
}

const createApolloResources = (idToken: string): ApolloResources => {
  const httpLink = new HttpLink({
    uri: appsyncUrl,
    headers: {
      Authorization: idToken,
    },
  });

  const ws = createWsClient({
    url: appsyncRealtimeUrl,
    connectionParams: () => ({
      host: appsyncRealtimeHost,
      Authorization: idToken,
      authToken: idToken,
    }),
    lazy: true,
    keepAlive: 30_000,
    retryAttempts: Infinity,
    shouldRetry: () => true,
  });

  const wsLink = new GraphQLWsLink(ws);

  const link = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === Kind.OPERATION_DEFINITION &&
        definition.operation === OperationTypeNode.SUBSCRIPTION
      );
    },
    wsLink,
    httpLink
  );

  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });

  return { client, ws };
};

const useApolloClient = () => {
  const [resource, setResource] = useState<ApolloResources | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady()) {
      setError("Authentication is disabled.");
      return undefined;
    }

    if (!isApiReady()) {
      setError("API is not enabled.");
      return undefined;
    }

    const tokens = getTokens();
    if (!tokens || tokens.expiresAt <= Date.now()) {
      signOut();
      void window.location.replace("/login");
      return undefined;
    }

    let cleanup: (() => void) | undefined;

    try {
      const resources = createApolloResources(tokens.idToken);
      setResource(resources);

      cleanup = () => {
        void resources.ws.dispose();
        void resources.client.stop();
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create GraphQL client.";
      setError(message);
    }

    return cleanup;
  }, []);

  return useMemo(() => ({ resource, error }), [resource, error]);
};

interface GraphQLProviderProps {
  children: ReactNode | ReactNode[];
}

export function GraphQLProvider({
  children,
}: GraphQLProviderProps): JSX.Element {
  const { resource, error } = useApolloClient();

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-pulse rounded-md bg-brand-surface/60 px-4 py-2 text-sm text-brand-muted">
          Connecting to AppSync…
        </div>
      </div>
    );
  }

  type ApolloProviderProps = ComponentProps<typeof ApolloProvider>;
  const safeChildren = children as ApolloProviderProps["children"];

  return (
    <ApolloProvider client={resource.client}>{safeChildren}</ApolloProvider>
  );
}
