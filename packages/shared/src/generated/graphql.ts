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
  markProgress: Progress;
  publishProgress: Progress;
  rateShow: UserSubscription;
  subscribe: UserSubscription;
  unsubscribe: Scalars['Boolean']['output'];
};


export type MutationMarkProgressArgs = {
  completed: Scalars['Boolean']['input'];
  episodeId: Scalars['ID']['input'];
  positionSec: Scalars['Int']['input'];
  showId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationPublishProgressArgs = {
  completed: Scalars['Boolean']['input'];
  episodeId: Scalars['ID']['input'];
  positionSec: Scalars['Int']['input'];
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
  positionSec: Scalars['Int']['output'];
  showId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['AWSDateTime']['output'];
};

export type Query = {
  __typename: 'Query';
  episode?: Maybe<Episode>;
  episodeProgress: Array<Progress>;
  episodes: EpisodeConnection;
  health: Scalars['String']['output'];
  myProfile: UserProfile;
  mySubscription?: Maybe<UserSubscription>;
  mySubscriptions: SubscriptionConnection;
  search: Array<Show>;
  show: Show;
};


export type QueryEpisodeArgs = {
  episodeId: Scalars['ID']['input'];
  showId: Scalars['ID']['input'];
};


export type QueryEpisodeProgressArgs = {
  episodeIds: Array<Scalars['ID']['input']>;
};


export type QueryEpisodesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
  showId: Scalars['ID']['input'];
};


export type QueryMySubscriptionArgs = {
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


export type QueryShowArgs = {
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

export type Subscription = {
  __typename: 'Subscription';
  onProgress: Progress;
};


export type SubscriptionOnProgressArgs = {
  episodeId: Scalars['ID']['input'];
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

export type HealthCheckQueryVariables = Exact<{ [key: string]: never; }>;


export type HealthCheckQuery = { __typename: 'Query', health: string };

export type MySubscriptionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type MySubscriptionsQuery = { __typename: 'Query', mySubscriptions: { __typename: 'SubscriptionConnection', nextToken?: string | null | undefined, items: Array<{ __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined }> } };

export type EpisodesByShowQueryVariables = Exact<{
  showId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type EpisodesByShowQuery = { __typename: 'Query', episodes: { __typename: 'EpisodeConnection', nextToken?: string | null | undefined, items: Array<{ __typename: 'Episode', episodeId: string, showId: string, title: string, audioUrl: string, publishedAt: any, durationSec: number, description?: string | null | undefined, htmlDescription?: string | null | undefined, image?: string | null | undefined, linkUrl?: string | null | undefined, explicit?: boolean | null | undefined, isExternallyHosted?: boolean | null | undefined, isPlayable?: boolean | null | undefined, releaseDatePrecision?: string | null | undefined, languages?: Array<string> | null | undefined }> } };

export type ShowByIdQueryVariables = Exact<{
  showId: Scalars['ID']['input'];
}>;


export type ShowByIdQuery = { __typename: 'Query', show: { __typename: 'Show', id: string, title: string, publisher: string, description?: string | null | undefined, htmlDescription?: string | null | undefined, image?: string | null | undefined, totalEpisodes: number, externalUrl?: string | null | undefined, categories: Array<string>, explicit?: boolean | null | undefined, languages?: Array<string> | null | undefined, availableMarkets?: Array<string> | null | undefined, mediaType?: string | null | undefined, isSubscribed?: boolean | null | undefined } };

export type MySubscriptionByShowQueryVariables = Exact<{
  showId: Scalars['ID']['input'];
}>;


export type MySubscriptionByShowQuery = { __typename: 'Query', mySubscription?: { __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined } | null | undefined };

export type EpisodeDetailsQueryVariables = Exact<{
  showId: Scalars['ID']['input'];
  episodeId: Scalars['ID']['input'];
}>;


export type EpisodeDetailsQuery = { __typename: 'Query', episode?: { __typename: 'Episode', showId: string, episodeId: string, title: string, audioUrl: string, publishedAt: any, durationSec: number, description?: string | null | undefined, htmlDescription?: string | null | undefined, image?: string | null | undefined, linkUrl?: string | null | undefined, explicit?: boolean | null | undefined, isExternallyHosted?: boolean | null | undefined, isPlayable?: boolean | null | undefined, releaseDatePrecision?: string | null | undefined, languages?: Array<string> | null | undefined } | null | undefined };

export type EpisodeProgressByIdsQueryVariables = Exact<{
  episodeIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type EpisodeProgressByIdsQuery = { __typename: 'Query', episodeProgress: Array<{ __typename: 'Progress', episodeId: string, positionSec: number, completed: boolean, updatedAt: any, showId?: string | null | undefined }> };

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


export type RateShowMutation = { __typename: 'Mutation', rateShow: { __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, ratingStars?: number | null | undefined, ratingReview?: string | null | undefined, ratingUpdatedAt?: any | null | undefined } };

export type MarkEpisodeProgressMutationVariables = Exact<{
  episodeId: Scalars['ID']['input'];
  positionSec: Scalars['Int']['input'];
  completed: Scalars['Boolean']['input'];
  showId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type MarkEpisodeProgressMutation = { __typename: 'Mutation', markProgress: { __typename: 'Progress', episodeId: string, positionSec: number, completed: boolean, updatedAt: any, showId?: string | null | undefined } };

export type PublishProgressUpdateMutationVariables = Exact<{
  episodeId: Scalars['ID']['input'];
  positionSec: Scalars['Int']['input'];
  completed: Scalars['Boolean']['input'];
}>;


export type PublishProgressUpdateMutation = { __typename: 'Mutation', publishProgress: { __typename: 'Progress', episodeId: string, positionSec: number, completed: boolean, updatedAt: any } };

export type OnProgressSubscriptionVariables = Exact<{
  episodeId: Scalars['ID']['input'];
}>;


export type OnProgressSubscription = { __typename: 'Subscription', onProgress: { __typename: 'Progress', episodeId: string, positionSec: number, completed: boolean, updatedAt: any } };

export type MyProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type MyProfileQuery = { __typename: 'Query', myProfile: { __typename: 'UserProfile', stats: { __typename: 'ProfileStats', totalShows: number, episodesCompleted: number, episodesInProgress: number }, spotlight: Array<{ __typename: 'ProfileShow', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, completedEpisodes: number, inProgressEpisodes: number, unlistenedEpisodes: number, subscriptionSyncedAt?: any | null | undefined }>, shows: Array<{ __typename: 'ProfileShow', showId: string, title: string, publisher: string, image: string, addedAt: any, totalEpisodes: number, completedEpisodes: number, inProgressEpisodes: number, unlistenedEpisodes: number, subscriptionSyncedAt?: any | null | undefined }> } };


export const HealthCheckDocument = gql`
    query HealthCheck {
  health
}
    `;
export type HealthCheckQueryResult = ApolloReactCommon.QueryResult<HealthCheckQuery, HealthCheckQueryVariables>;
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
export const EpisodesByShowDocument = gql`
    query EpisodesByShow($showId: ID!, $limit: Int, $nextToken: String) {
  episodes(showId: $showId, limit: $limit, nextToken: $nextToken) {
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
}
    `;
export type EpisodesByShowQueryResult = ApolloReactCommon.QueryResult<EpisodesByShowQuery, EpisodesByShowQueryVariables>;
export const ShowByIdDocument = gql`
    query ShowById($showId: ID!) {
  show(showId: $showId) {
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
export type ShowByIdQueryResult = ApolloReactCommon.QueryResult<ShowByIdQuery, ShowByIdQueryVariables>;
export const MySubscriptionByShowDocument = gql`
    query MySubscriptionByShow($showId: ID!) {
  mySubscription(showId: $showId) {
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
export type MySubscriptionByShowQueryResult = ApolloReactCommon.QueryResult<MySubscriptionByShowQuery, MySubscriptionByShowQueryVariables>;
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
export const EpisodeProgressByIdsDocument = gql`
    query EpisodeProgressByIds($episodeIds: [ID!]!) {
  episodeProgress(episodeIds: $episodeIds) {
    episodeId
    positionSec
    completed
    updatedAt
    showId
  }
}
    `;
export type EpisodeProgressByIdsQueryResult = ApolloReactCommon.QueryResult<EpisodeProgressByIdsQuery, EpisodeProgressByIdsQueryVariables>;
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
    ratingStars
    ratingReview
    ratingUpdatedAt
  }
}
    `;
export type RateShowMutationResult = ApolloReactCommon.MutationResult<RateShowMutation>;
export const MarkEpisodeProgressDocument = gql`
    mutation MarkEpisodeProgress($episodeId: ID!, $positionSec: Int!, $completed: Boolean!, $showId: ID) {
  markProgress(
    episodeId: $episodeId
    positionSec: $positionSec
    completed: $completed
    showId: $showId
  ) {
    episodeId
    positionSec
    completed
    updatedAt
    showId
  }
}
    `;
export type MarkEpisodeProgressMutationResult = ApolloReactCommon.MutationResult<MarkEpisodeProgressMutation>;
export const PublishProgressUpdateDocument = gql`
    mutation PublishProgressUpdate($episodeId: ID!, $positionSec: Int!, $completed: Boolean!) {
  publishProgress(
    episodeId: $episodeId
    positionSec: $positionSec
    completed: $completed
  ) {
    episodeId
    positionSec
    completed
    updatedAt
  }
}
    `;
export type PublishProgressUpdateMutationResult = ApolloReactCommon.MutationResult<PublishProgressUpdateMutation>;
export const OnProgressDocument = gql`
    subscription OnProgress($episodeId: ID!) {
  onProgress(episodeId: $episodeId) {
    episodeId
    positionSec
    completed
    updatedAt
  }
}
    `;
export type OnProgressSubscriptionResult = ApolloReactCommon.SubscriptionResult<OnProgressSubscription>;
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
    }
  }
}
    `;
export type MyProfileQueryResult = ApolloReactCommon.QueryResult<MyProfileQuery, MyProfileQueryVariables>;