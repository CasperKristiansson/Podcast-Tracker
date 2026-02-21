import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  from,
} from "@apollo/client/core";
import { Observable } from "@apollo/client/utilities";
import type { SessionManager } from "../auth/session-manager.js";
import type { CliConfig } from "../types.js";

export const createCliApolloClient = (
  config: CliConfig,
  sessionManager: SessionManager
): ApolloClient => {
  const authLink = new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      let subscription: { unsubscribe(): void } | null = null;

      void sessionManager
        .getValidIdToken()
        .then((token) => {
          operation.setContext(
            ({ headers = {} }: { headers?: Record<string, string> }) => ({
              headers: {
                ...headers,
                Authorization: token,
              },
            })
          );

          if (!forward) {
            observer.complete();
            return;
          }

          subscription = forward(operation).subscribe({
            next: (result) => observer.next(result),
            error: (error) => observer.error(error),
            complete: () => observer.complete(),
          });
        })
        .catch((error) => {
          observer.error(error);
        });

      return () => {
        subscription?.unsubscribe();
      };
    });
  });

  const httpLink = new HttpLink({
    uri: config.appsyncUrl,
    fetch,
  });

  return new ApolloClient({
    link: from([authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: "network-only",
      },
      watchQuery: {
        fetchPolicy: "network-only",
      },
    },
  });
};
