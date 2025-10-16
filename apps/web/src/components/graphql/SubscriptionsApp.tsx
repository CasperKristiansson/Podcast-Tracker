import { GraphQLProvider } from "./GraphQLProvider";
import SubscriptionsView from "./SubscriptionsView";

export default function SubscriptionsApp(): JSX.Element {
  return (
    <GraphQLProvider>
      <SubscriptionsView />
    </GraphQLProvider>
  );
}
