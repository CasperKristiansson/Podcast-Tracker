import { GraphQLProvider } from "../graphql/GraphQLProvider";
import PodcastSearchBar, {
  type PodcastSearchBarProps,
} from "./PodcastSearchBar";

export default function PodcastSearchBarWithProvider(
  props: PodcastSearchBarProps
): JSX.Element {
  return (
    <GraphQLProvider
      fallback={
        <div className="flex items-center justify-center">
          <div className="animate-pulse rounded-md bg-brand-surface/60 px-4 py-2 text-sm text-brand-muted">
            Connecting to AppSync…
          </div>
        </div>
      }
    >
      <PodcastSearchBar {...props} />
    </GraphQLProvider>
  );
}
