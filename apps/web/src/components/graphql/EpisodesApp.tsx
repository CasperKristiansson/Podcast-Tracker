import { GraphQLProvider } from './GraphQLProvider';
import EpisodesView from './EpisodesView';

interface EpisodesAppProps {
  showId: string;
}

export default function EpisodesApp({ showId }: EpisodesAppProps): JSX.Element {
  return (
    <GraphQLProvider>
      <EpisodesView showId={showId} />
    </GraphQLProvider>
  );
}
