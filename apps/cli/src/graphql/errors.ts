interface GraphQLErrorLike {
  message?: string;
}

interface ErrorLike {
  message?: string;
  graphQLErrors?: GraphQLErrorLike[];
  networkError?: { message?: string };
}

const isErrorLike = (value: unknown): value is ErrorLike => {
  return typeof value === "object" && value !== null;
};

export const normalizeApiError = (error: unknown): string => {
  if (isErrorLike(error)) {
    const gqlErrors = Array.isArray(error.graphQLErrors)
      ? error.graphQLErrors
          .map((item) => item?.message)
          .filter((item): item is string => typeof item === "string")
      : [];

    const gqlMessage = gqlErrors.join("; ");
    const normalized = gqlMessage.toLowerCase();

    if (normalized.includes("unauthorized")) {
      return "Session expired or unauthorized. Run: podcast-tracker auth login";
    }

    if (normalized.includes("rate limit")) {
      return "Spotify rate limit reached. Please wait a minute and retry.";
    }

    if (gqlMessage.length > 0) {
      return gqlMessage;
    }

    if (error.networkError?.message) {
      return `Network error: ${error.networkError.message}`;
    }

    if (typeof error.message === "string" && error.message.length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown API error.";
};
