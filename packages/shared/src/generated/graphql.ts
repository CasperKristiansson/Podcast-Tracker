import { gql } from '@apollo/client';
import type * as ApolloReactCommon from '@apollo/client/react';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  AWSDateTime: { input: any; output: any; }
};

export type Episode = {
  __typename: 'Episode';
  audioUrl: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  durationSec: Scalars['Int']['output'];
  episodeId: Scalars['ID']['output'];
  explicit?: Maybe<Scalars['Boolean']['output']>;
  htmlDescription?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  isExternallyHosted?: Maybe<Scalars['Boolean']['output']>;
  isPlayable?: Maybe<Scalars['Boolean']['output']>;
  languages?: Maybe<Array<Scalars['String']['output']>>;
  linkUrl?: Maybe<Scalars['String']['output']>;
  publishedAt: Scalars['AWSDateTime']['output'];
  releaseDatePrecision?: Maybe<Scalars['String']['output']>;
  showId: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type EpisodeConnection = PaginatedResult & {
  __typename: 'EpisodeConnection';
  items: Array<Episode>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename: 'Mutation';
  markAllEpisodesComplete: Array<Progress>;
  markNextEpisodeComplete: Progress;
  markProgress: Progress;
  rateShow: UserSubscription;
  subscribe: UserSubscription;
  unsubscribe: Scalars['Boolean']['output'];
};


export type MutationMarkAllEpisodesCompleteArgs = {
  showId: Scalars['ID']['input'];
};


export type MutationMarkNextEpisodeCompleteArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  showId: Scalars['ID']['input'];
};


export type MutationMarkProgressArgs = {
  completed: Scalars['Boolean']['input'];
  episodeId: Scalars['ID']['input'];
  showId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationRateShowArgs = {
  review?: InputMaybe<Scalars['String']['input']>;
  showId: Scalars['ID']['input'];
  stars: Scalars['Int']['input'];
};


export type MutationSubscribeArgs = {
  image: Scalars['String']['input'];
  publisher: Scalars['String']['input'];
  showId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
  totalEpisodes?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationUnsubscribeArgs = {
  showId: Scalars['ID']['input'];
};

export type PaginatedResult = {
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type ProfileShow = {
  __typename: 'ProfileShow';
  addedAt: Scalars['AWSDateTime']['output'];
  completedEpisodes: Scalars['Int']['output'];
  image: Scalars['String']['output'];
  inProgressEpisodes: Scalars['Int']['output'];
  publisher: Scalars['String']['output'];
  ratingReview?: Maybe<Scalars['String']['output']>;
  ratingStars?: Maybe<Scalars['Int']['output']>;
  ratingUpdatedAt?: Maybe<Scalars['AWSDateTime']['output']>;
  showId: Scalars['ID']['output'];
  subscriptionSyncedAt?: Maybe<Scalars['AWSDateTime']['output']>;
  title: Scalars['String']['output'];
  totalEpisodes: Scalars['Int']['output'];
  unlistenedEpisodes: Scalars['Int']['output'];
};

export type ProfileStats = {
  __typename: 'ProfileStats';
  episodesCompleted: Scalars['Int']['output'];
  episodesInProgress: Scalars['Int']['output'];
  totalShows: Scalars['Int']['output'];
};

export type Progress = {
  __typename: 'Progress';
  completed: Scalars['Boolean']['output'];
  episodeId: Scalars['ID']['output'];
  showId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['AWSDateTime']['output'];
};

export type Query = {
  __typename: 'Query';
  episode?: Maybe<Episode>;
  myProfile: UserProfile;
  mySubscriptions: SubscriptionConnection;
  search: Array<Show>;
  showDetail: ShowDetail;
};


export type QueryEpisodeArgs = {
  episodeId: Scalars['ID']['input'];
  showId: Scalars['ID']['input'];
};


export type QueryMySubscriptionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySearchArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  term: Scalars['String']['input'];
};


export type QueryShowDetailArgs = {
  episodeCursor?: InputMaybe<Scalars['String']['input']>;
  episodeLimit?: InputMaybe<Scalars['Int']['input']>;
  progressEpisodeIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  showId: Scalars['ID']['input'];
};

export type Show = {
  __typename: 'Show';
  availableMarkets?: Maybe<Array<Scalars['String']['output']>>;
  categories: Array<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  explicit?: Maybe<Scalars['Boolean']['output']>;
  externalUrl?: Maybe<Scalars['String']['output']>;
  htmlDescription?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<Scalars['String']['output']>;
  isSubscribed?: Maybe<Scalars['Boolean']['output']>;
  languages?: Maybe<Array<Scalars['String']['output']>>;
  mediaType?: Maybe<Scalars['String']['output']>;
  publisher: Scalars['String']['output'];
  title: Scalars['String']['output'];
  totalEpisodes: Scalars['Int']['output'];
};

export type ShowDetail = {
  __typename: 'ShowDetail';
  episodes: EpisodeConnection;
  progress: Array<Progress>;
  show: Show;
  subscription?: Maybe<UserSubscription>;
};

export type SubscriptionConnection = PaginatedResult & {
  __typename: 'SubscriptionConnection';
  items: Array<UserSubscription>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type UserProfile = {
  __typename: 'UserProfile';
  shows: Array<ProfileShow>;
  spotlight: Array<ProfileShow>;
  stats: ProfileStats;
};

export type UserSubscription = {
  __typename: 'UserSubscription';
  addedAt: Scalars['AWSDateTime']['output'];
  image: Scalars['String']['output'];
  publisher: Scalars['String']['output'];
  ratingReview?: Maybe<Scalars['String']['output']>;
  ratingStars?: Maybe<Scalars['Int']['output']>;
  ratingUpdatedAt?: Maybe<Scalars['AWSDateTime']['output']>;
  showId: Scalars['ID']['output'];
  subscriptionSyncedAt?: Maybe<Scalars['AWSDateTime']['output']>;
  title: Scalars['String']['output'];
  totalEpisodes: Scalars['Int']['output'];
};

export type MySubscriptionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type MySubscriptionsQuery = { __typename: 'Query', mySubscriptions: { __typename: 'SubscriptionConnection', nextToken?: string | null | undefined, items: Array<{ __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined }> } };

export type ShowDetailQueryVariables = Exact<{
  showId: Scalars['ID']['input'];
  episodeLimit?: InputMaybe<Scalars['Int']['input']>;
  episodeCursor?: InputMaybe<Scalars['String']['input']>;
  progressEpisodeIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type ShowDetailQuery = { __typename: 'Query', showDetail: { __typename: 'ShowDetail', show: { __typename: 'Show', id: string, title: string, publisher: string, description?: string | null | undefined, htmlDescription?: string | null | undefined, image?: string | null | undefined, totalEpisodes: number, externalUrl?: string | null | undefined, categories: Array<string>, explicit?: boolean | null | undefined, languages?: Array<string> | null | undefined, availableMarkets?: Array<string> | null | undefined, mediaType?: string | null | undefined, isSubscribed?: boolean | null | undefined }, subscription?: { __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined, subscriptionSyncedAt?: any | null | undefined } | null | undefined, episodes: { __typename: 'EpisodeConnection', nextToken?: string | null | undefined, items: Array<{ __typename: 'Episode', episodeId: string, showId: string, title: string, audioUrl: string, publishedAt: any, durationSec: number, description?: string | null | undefined, htmlDescription?: string | null | undefined, image?: string | null | undefined, linkUrl?: string | null | undefined, explicit?: boolean | null | undefined, isExternallyHosted?: boolean | null | undefined, isPlayable?: boolean | null | undefined, releaseDatePrecision?: string | null | undefined, languages?: Array<string> | null | undefined }> }, progress: Array<{ __typename: 'Progress', episodeId: string, completed: boolean, updatedAt: any, showId?: string | null | undefined }> } };

export type EpisodeDetailsQueryVariables = Exact<{
  showId: Scalars['ID']['input'];
  episodeId: Scalars['ID']['input'];
}>;


export type EpisodeDetailsQuery = { __typename: 'Query', episode?: { __typename: 'Episode', showId: string, episodeId: string, title: string, audioUrl: string, publishedAt: any, durationSec: number, description?: string | null | undefined, htmlDescription?: string | null | undefined, image?: string | null | undefined, linkUrl?: string | null | undefined, explicit?: boolean | null | undefined, isExternallyHosted?: boolean | null | undefined, isPlayable?: boolean | null | undefined, releaseDatePrecision?: string | null | undefined, languages?: Array<string> | null | undefined } | null | undefined };

export type SearchShowsQueryVariables = Exact<{
  term: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchShowsQuery = { __typename: 'Query', search: Array<{ __typename: 'Show', id: string, title: string, publisher: string, description?: string | null | undefined, htmlDescription?: string | null | undefined, image?: string | null | undefined, totalEpisodes: number, externalUrl?: string | null | undefined, categories: Array<string>, explicit?: boolean | null | undefined, languages?: Array<string> | null | undefined, availableMarkets?: Array<string> | null | undefined, mediaType?: string | null | undefined, isSubscribed?: boolean | null | undefined }> };

export type SubscribeToShowMutationVariables = Exact<{
  showId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
  publisher: Scalars['String']['input'];
  image: Scalars['String']['input'];
  totalEpisodes?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SubscribeToShowMutation = { __typename: 'Mutation', subscribe: { __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined } };

export type UnsubscribeFromShowMutationVariables = Exact<{
  showId: Scalars['ID']['input'];
}>;


export type UnsubscribeFromShowMutation = { __typename: 'Mutation', unsubscribe: boolean };

export type RateShowMutationVariables = Exact<{
  showId: Scalars['ID']['input'];
  stars: Scalars['Int']['input'];
  review?: InputMaybe<Scalars['String']['input']>;
}>;


export type RateShowMutation = { __typename: 'Mutation', rateShow: { __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, subscriptionSyncedAt?: any | null | undefined, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined } };

export type MarkEpisodeProgressMutationVariables = Exact<{
  episodeId: Scalars['ID']['input'];
  completed: Scalars['Boolean']['input'];
  showId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type MarkEpisodeProgressMutation = { __typename: 'Mutation', markProgress: { __typename: 'Progress', episodeId: string, completed: boolean, updatedAt: any, showId?: string | null | undefined } };

export type MarkNextEpisodeCompleteMutationVariables = Exact<{
  showId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MarkNextEpisodeCompleteMutation = { __typename: 'Mutation', markNextEpisodeComplete: { __typename: 'Progress', episodeId: string, completed: boolean, updatedAt: any, showId?: string | null | undefined } };

export type MarkAllEpisodesCompleteMutationVariables = Exact<{
  showId: Scalars['ID']['input'];
}>;


export type MarkAllEpisodesCompleteMutation = { __typename: 'Mutation', markAllEpisodesComplete: Array<{ __typename: 'Progress', episodeId: string, completed: boolean, updatedAt: any, showId?: string | null | undefined }> };

export type MyProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type MyProfileQuery = { __typename: 'Query', myProfile: { __typename: 'UserProfile', stats: { __typename: 'ProfileStats', totalShows: number, episodesCompleted: number, episodesInProgress: number }, spotlight: Array<{ __typename: 'ProfileShow', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, completedEpisodes: number, inProgressEpisodes: number, unlistenedEpisodes: number, subscriptionSyncedAt?: any | null | undefined, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined }>, shows: Array<{ __typename: 'ProfileShow', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, completedEpisodes: number, inProgressEpisodes: number, unlistenedEpisodes: number, subscriptionSyncedAt?: any | null | undefined, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined }> } };


export const MySubscriptionsDocument = gql`
    query MySubscriptions($limit: Int, $nextToken: String) {
  mySubscriptions(limit: $limit, nextToken: $nextToken) {
    items {
      showId
      title
      publisher
      image
      addedAt
      totalEpisodes
      ratingStars
      ratingReview
      ratingUpdatedAt
    }
    nextToken
  }
}
    `;
export type MySubscriptionsQueryResult = ApolloReactCommon.QueryResult<MySubscriptionsQuery, MySubscriptionsQueryVariables>;
export const ShowDetailDocument = gql`
    query ShowDetail($showId: ID!, $episodeLimit: Int, $episodeCursor: String, $progressEpisodeIds: [ID!]) {
  showDetail(
    showId: $showId
    episodeLimit: $episodeLimit
    episodeCursor: $episodeCursor
    progressEpisodeIds: $progressEpisodeIds
  ) {
    show {
      id
      title
      publisher
      description
      htmlDescription
      image
      totalEpisodes
      externalUrl
      categories
      explicit
      languages
      availableMarkets
      mediaType
      isSubscribed
    }
    subscription {
      showId
      title
      publisher
      image
      addedAt
      totalEpisodes
      ratingStars
      ratingReview
      ratingUpdatedAt
      subscriptionSyncedAt
    }
    episodes {
      items {
        episodeId
        showId
        title
        audioUrl
        publishedAt
        durationSec
        description
        htmlDescription
        image
        linkUrl
        explicit
        isExternallyHosted
        isPlayable
        releaseDatePrecision
        languages
      }
      nextToken
    }
    progress {
      episodeId
      completed
      updatedAt
      showId
    }
  }
}
    `;
export type ShowDetailQueryResult = ApolloReactCommon.QueryResult<ShowDetailQuery, ShowDetailQueryVariables>;
export const EpisodeDetailsDocument = gql`
    query EpisodeDetails($showId: ID!, $episodeId: ID!) {
  episode(showId: $showId, episodeId: $episodeId) {
    showId
    episodeId
    title
    audioUrl
    publishedAt
    durationSec
    description
    htmlDescription
    image
    linkUrl
    explicit
    isExternallyHosted
    isPlayable
    releaseDatePrecision
    languages
  }
}
    `;
export type EpisodeDetailsQueryResult = ApolloReactCommon.QueryResult<EpisodeDetailsQuery, EpisodeDetailsQueryVariables>;
export const SearchShowsDocument = gql`
    query SearchShows($term: String!, $limit: Int, $offset: Int) {
  search(term: $term, limit: $limit, offset: $offset) {
    id
    title
    publisher
    description
    htmlDescription
    image
    totalEpisodes
    externalUrl
    categories
    explicit
    languages
    availableMarkets
    mediaType
    isSubscribed
  }
}
    `;
export type SearchShowsQueryResult = ApolloReactCommon.QueryResult<SearchShowsQuery, SearchShowsQueryVariables>;
export const SubscribeToShowDocument = gql`
    mutation SubscribeToShow($showId: ID!, $title: String!, $publisher: String!, $image: String!, $totalEpisodes: Int) {
  subscribe(
    showId: $showId
    title: $title
    publisher: $publisher
    image: $image
    totalEpisodes: $totalEpisodes
  ) {
    showId
    title
    publisher
    image
    addedAt
    totalEpisodes
    ratingStars
    ratingReview
    ratingUpdatedAt
  }
}
    `;
export type SubscribeToShowMutationResult = ApolloReactCommon.MutationResult<SubscribeToShowMutation>;
export const UnsubscribeFromShowDocument = gql`
    mutation UnsubscribeFromShow($showId: ID!) {
  unsubscribe(showId: $showId)
}
    `;
export type UnsubscribeFromShowMutationResult = ApolloReactCommon.MutationResult<UnsubscribeFromShowMutation>;
export const RateShowDocument = gql`
    mutation RateShow($showId: ID!, $stars: Int!, $review: String) {
  rateShow(showId: $showId, stars: $stars, review: $review) {
    showId
    title
    publisher
    image
    addedAt
    totalEpisodes
    subscriptionSyncedAt
    ratingStars
    ratingReview
    ratingUpdatedAt
  }
}
    `;
export type RateShowMutationResult = ApolloReactCommon.MutationResult<RateShowMutation>;
export const MarkEpisodeProgressDocument = gql`
    mutation MarkEpisodeProgress($episodeId: ID!, $completed: Boolean!, $showId: ID) {
  markProgress(episodeId: $episodeId, completed: $completed, showId: $showId) {
    episodeId
    completed
    updatedAt
    showId
  }
}
    `;
export type MarkEpisodeProgressMutationResult = ApolloReactCommon.MutationResult<MarkEpisodeProgressMutation>;
export const MarkNextEpisodeCompleteDocument = gql`
    mutation MarkNextEpisodeComplete($showId: ID!, $limit: Int) {
  markNextEpisodeComplete(showId: $showId, limit: $limit) {
    episodeId
    completed
    updatedAt
    showId
  }
}
    `;
export type MarkNextEpisodeCompleteMutationResult = ApolloReactCommon.MutationResult<MarkNextEpisodeCompleteMutation>;
export const MarkAllEpisodesCompleteDocument = gql`
    mutation MarkAllEpisodesComplete($showId: ID!) {
  markAllEpisodesComplete(showId: $showId) {
    episodeId
    completed
    updatedAt
    showId
  }
}
    `;
export type MarkAllEpisodesCompleteMutationResult = ApolloReactCommon.MutationResult<MarkAllEpisodesCompleteMutation>;
export const MyProfileDocument = gql`
    query MyProfile {
  myProfile {
    stats {
      totalShows
      episodesCompleted
      episodesInProgress
    }
    spotlight {
      showId
      title
      publisher
      image
      addedAt
      totalEpisodes
      completedEpisodes
      inProgressEpisodes
      unlistenedEpisodes
      subscriptionSyncedAt
      ratingStars
      ratingReview
      ratingUpdatedAt
    }
    shows {
      showId
      title
      publisher
      image
      addedAt
      totalEpisodes
      completedEpisodes
      inProgressEpisodes
      unlistenedEpisodes
      subscriptionSyncedAt
      ratingStars
      ratingReview
      ratingUpdatedAt
    }
  }
}
    `;
export type MyProfileQueryResult = ApolloReactCommon.QueryResult<MyProfileQuery, MyProfileQueryVariables>;