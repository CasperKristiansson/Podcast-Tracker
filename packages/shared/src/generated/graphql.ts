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
  durationSec: Scalars['Int']['output'];
  episodeId: Scalars['ID']['output'];
  publishedAt: Scalars['AWSDateTime']['output'];
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
  subscribe: UserSubscription;
};


export type MutationMarkProgressArgs = {
  completed: Scalars['Boolean']['input'];
  episodeId: Scalars['ID']['input'];
  positionSec: Scalars['Int']['input'];
};


export type MutationPublishProgressArgs = {
  completed: Scalars['Boolean']['input'];
  episodeId: Scalars['ID']['input'];
  positionSec: Scalars['Int']['input'];
};


export type MutationSubscribeArgs = {
  image: Scalars['String']['input'];
  publisher: Scalars['String']['input'];
  showId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type PaginatedResult = {
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type Progress = {
  __typename: 'Progress';
  completed: Scalars['Boolean']['output'];
  episodeId: Scalars['ID']['output'];
  positionSec: Scalars['Int']['output'];
  updatedAt: Scalars['AWSDateTime']['output'];
};

export type Query = {
  __typename: 'Query';
  episodes: EpisodeConnection;
  health: Scalars['String']['output'];
  mySubscriptions: SubscriptionConnection;
  search: Array<Show>;
};


export type QueryEpisodesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
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

export type Show = {
  __typename: 'Show';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<Scalars['String']['output']>;
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

export type UserSubscription = {
  __typename: 'UserSubscription';
  addedAt: Scalars['AWSDateTime']['output'];
  image: Scalars['String']['output'];
  publisher: Scalars['String']['output'];
  showId: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type HealthCheckQueryVariables = Exact<{ [key: string]: never; }>;


export type HealthCheckQuery = { __typename: 'Query', health: string };

export type MySubscriptionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type MySubscriptionsQuery = { __typename: 'Query', mySubscriptions: { __typename: 'SubscriptionConnection', nextToken?: string | null | undefined, items: Array<{ __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any }> } };

export type EpisodesByShowQueryVariables = Exact<{
  showId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type EpisodesByShowQuery = { __typename: 'Query', episodes: { __typename: 'EpisodeConnection', nextToken?: string | null | undefined, items: Array<{ __typename: 'Episode', episodeId: string, showId: string, title: string, audioUrl: string, publishedAt: any, durationSec: number }> } };

export type SearchShowsQueryVariables = Exact<{
  term: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchShowsQuery = { __typename: 'Query', search: Array<{ __typename: 'Show', id: string, title: string, publisher: string, description?: string | null | undefined, image?: string | null | undefined, totalEpisodes: number }> };

export type SubscribeToShowMutationVariables = Exact<{
  showId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
  publisher: Scalars['String']['input'];
  image: Scalars['String']['input'];
}>;


export type SubscribeToShowMutation = { __typename: 'Mutation', subscribe: { __typename: 'UserSubscription', showId: string, title: string, publisher: string, image: string, addedAt: any } };

export type MarkEpisodeProgressMutationVariables = Exact<{
  episodeId: Scalars['ID']['input'];
  positionSec: Scalars['Int']['input'];
  completed: Scalars['Boolean']['input'];
}>;


export type MarkEpisodeProgressMutation = { __typename: 'Mutation', markProgress: { __typename: 'Progress', episodeId: string, positionSec: number, completed: boolean, updatedAt: any } };

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
    }
    nextToken
  }
}
    `;
export type EpisodesByShowQueryResult = ApolloReactCommon.QueryResult<EpisodesByShowQuery, EpisodesByShowQueryVariables>;
export const SearchShowsDocument = gql`
    query SearchShows($term: String!, $limit: Int, $offset: Int) {
  search(term: $term, limit: $limit, offset: $offset) {
    id
    title
    publisher
    description
    image
    totalEpisodes
  }
}
    `;
export type SearchShowsQueryResult = ApolloReactCommon.QueryResult<SearchShowsQuery, SearchShowsQueryVariables>;
export const SubscribeToShowDocument = gql`
    mutation SubscribeToShow($showId: ID!, $title: String!, $publisher: String!, $image: String!) {
  subscribe(showId: $showId, title: $title, publisher: $publisher, image: $image) {
    showId
    title
    publisher
    image
    addedAt
  }
}
    `;
export type SubscribeToShowMutationResult = ApolloReactCommon.MutationResult<SubscribeToShowMutation>;
export const MarkEpisodeProgressDocument = gql`
    mutation MarkEpisodeProgress($episodeId: ID!, $positionSec: Int!, $completed: Boolean!) {
  markProgress(
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