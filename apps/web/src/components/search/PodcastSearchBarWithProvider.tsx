import { GraphQLProvider } from "../graphql/GraphQLProvider";
import PodcastSearchBar, {
  type PodcastSearchBarProps,
} from "./PodcastSearchBar";

export default function PodcastSearchBarWithProvider(
  props: PodcastSearchBarProps
): JSX.Element {
  return (
    <GraphQLProvider fallback={null}>
      <PodcastSearchBar {...props} />
    </GraphQLProvider>
  );
}
