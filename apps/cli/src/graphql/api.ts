import type { ApolloClient } from "@apollo/client/core";
import {
  DropShowDocument,
  EpisodeDetailsDocument,
  type EpisodeDetailsQuery,
  type EpisodeDetailsQueryVariables,
  MarkAllEpisodesCompleteDocument,
  MarkEpisodeProgressDocument,
  MarkNextEpisodeCompleteDocument,
  MyProfileDocument,
  type MyProfileQuery,
  type MyProfileQueryVariables,
  RateShowDocument,
  SearchShowsDocument,
  type SearchShowsQuery,
  type SearchShowsQueryVariables,
  ShowDetailDocument,
  type ShowDetailQuery,
  type ShowDetailQueryVariables,
  SubscribeToShowDocument,
  UnsubscribeFromShowDocument,
} from "../../../../packages/shared/src/generated/graphql.js";

export class PodcastApi {
  constructor(private readonly client: ApolloClient) {}

  async myProfile(): Promise<MyProfileQuery["myProfile"]> {
    const result = await this.client.query<
      MyProfileQuery,
      MyProfileQueryVariables
    >({
      query: MyProfileDocument,
      variables: {},
    });

    if (!result.data?.myProfile) {
      throw new Error("Profile query returned no data.");
    }

    return result.data.myProfile;
  }

  async searchShows(
    term: string,
    limit = 15,
    offset = 0
  ): Promise<SearchShowsQuery["search"]> {
    const result = await this.client.query<
      SearchShowsQuery,
      SearchShowsQueryVariables
    >({
      query: SearchShowsDocument,
      variables: { term, limit, offset },
    });
    return result.data?.search ?? [];
  }

  async showDetail(
    showId: string,
    episodeLimit = 25,
    episodeCursor?: string,
    progressEpisodeIds?: string[]
  ): Promise<ShowDetailQuery["showDetail"]> {
    const result = await this.client.query<
      ShowDetailQuery,
      ShowDetailQueryVariables
    >({
      query: ShowDetailDocument,
      variables: {
        showId,
        episodeLimit,
        episodeCursor,
        progressEpisodeIds,
      },
    });

    if (!result.data?.showDetail) {
      throw new Error("Show detail query returned no data.");
    }

    return result.data.showDetail;
  }

  async episodeDetails(
    showId: string,
    episodeId: string
  ): Promise<EpisodeDetailsQuery["episode"]> {
    const result = await this.client.query<
      EpisodeDetailsQuery,
      EpisodeDetailsQueryVariables
    >({
      query: EpisodeDetailsDocument,
      variables: { showId, episodeId },
    });

    return result.data?.episode;
  }

  async subscribe(show: {
    id: string;
    title: string;
    publisher: string;
    image?: string | null;
    totalEpisodes?: number | null;
  }): Promise<void> {
    await this.client.mutate({
      mutation: SubscribeToShowDocument,
      variables: {
        showId: show.id,
        title: show.title,
        publisher: show.publisher,
        image: show.image ?? "",
        totalEpisodes: show.totalEpisodes ?? 0,
      },
    });
  }

  async unsubscribe(showId: string): Promise<void> {
    await this.client.mutate({
      mutation: UnsubscribeFromShowDocument,
      variables: { showId },
    });
  }

  async dropShow(showId: string): Promise<void> {
    await this.client.mutate({
      mutation: DropShowDocument,
      variables: { showId },
    });
  }

  async rateShow(
    showId: string,
    stars: number,
    review?: string
  ): Promise<void> {
    await this.client.mutate({
      mutation: RateShowDocument,
      variables: {
        showId,
        stars,
        review: review && review.trim().length > 0 ? review.trim() : null,
      },
    });
  }

  async markEpisodeProgress(
    showId: string,
    episodeId: string,
    completed: boolean
  ): Promise<void> {
    await this.client.mutate({
      mutation: MarkEpisodeProgressDocument,
      variables: {
        showId,
        episodeId,
        completed,
      },
    });
  }

  async markNextEpisodeComplete(showId: string): Promise<void> {
    await this.client.mutate({
      mutation: MarkNextEpisodeCompleteDocument,
      variables: {
        showId,
        limit: 25,
      },
    });
  }

  async markAllEpisodesComplete(showId: string): Promise<number> {
    const result = await this.client.mutate<{
      markAllEpisodesComplete?: unknown[] | null;
    }>({
      mutation: MarkAllEpisodesCompleteDocument,
      variables: {
        showId,
      },
    });

    return result.data?.markAllEpisodesComplete?.length ?? 0;
  }
}
