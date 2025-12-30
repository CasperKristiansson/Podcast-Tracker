import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { Observable } from "@apollo/client/utilities";
import type {
  DropShowMutationVariables,
  MarkAllEpisodesCompleteMutationVariables,
  MarkEpisodeProgressMutationVariables,
  MarkNextEpisodeCompleteMutationVariables,
  RateShowMutationVariables,
  SearchShowsQueryVariables,
  ShowDetailQueryVariables,
  SubscribeToShowMutationVariables,
  UnsubscribeFromShowMutationVariables,
} from "@shared";
import {
  dropDemoShow,
  getDemoProfile,
  getDemoShowDetail,
  markDemoAllEpisodes,
  markDemoEpisodeProgress,
  markDemoNextEpisode,
  rateDemoShow,
  searchDemoShows,
  subscribeDemoShow,
  unsubscribeDemoShow,
} from "./data";

const createDemoLink = (): ApolloLink =>
  new ApolloLink((operation) => {
    return new Observable((observer) => {
      try {
        const { operationName, variables } = operation;
        let data: Record<string, unknown> | null = null;

        switch (operationName) {
          case "MyProfile":
            data = getDemoProfile();
            break;
          case "ShowDetail": {
            const vars = variables as ShowDetailQueryVariables;
            data = getDemoShowDetail(vars.showId);
            break;
          }
          case "SearchShows": {
            const vars = variables as SearchShowsQueryVariables;
            data = searchDemoShows(vars.term, vars.limit ?? undefined);
            break;
          }
          case "MarkEpisodeProgress": {
            const vars = variables as MarkEpisodeProgressMutationVariables;
            data = markDemoEpisodeProgress(
              vars.showId ?? "",
              vars.episodeId,
              vars.completed
            );
            break;
          }
          case "MarkAllEpisodesComplete": {
            const vars = variables as MarkAllEpisodesCompleteMutationVariables;
            data = markDemoAllEpisodes(vars.showId);
            break;
          }
          case "MarkNextEpisodeComplete": {
            const vars = variables as MarkNextEpisodeCompleteMutationVariables;
            data = markDemoNextEpisode(vars.showId);
            break;
          }
          case "SubscribeToShow": {
            const vars = variables as SubscribeToShowMutationVariables;
            data = subscribeDemoShow(vars.showId);
            break;
          }
          case "UnsubscribeFromShow": {
            const vars = variables as UnsubscribeFromShowMutationVariables;
            data = {
              __typename: "Mutation",
              unsubscribe: unsubscribeDemoShow(vars.showId),
            };
            break;
          }
          case "DropShow": {
            const vars = variables as DropShowMutationVariables;
            data = dropDemoShow(vars.showId);
            break;
          }
          case "RateShow": {
            const vars = variables as RateShowMutationVariables;
            data = rateDemoShow(vars.showId, vars.stars, vars.review ?? null);
            break;
          }
          default:
            data = {};
        }

        observer.next({ data });
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  });

export const createDemoApolloClient = (): ApolloClient => {
  return new ApolloClient({
    link: createDemoLink(),
    cache: new InMemoryCache(),
  });
};
