import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
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

/**
 * __useHealthCheckQuery__
 *
 * To run a query within a React component, call `useHealthCheckQuery` and pass it any options that fit your needs.
 * When your component renders, `useHealthCheckQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHealthCheckQuery({
 *   variables: {
 *   },
 * });
 */
export function useHealthCheckQuery(baseOptions?: Apollo.QueryHookOptions<HealthCheckQuery, HealthCheckQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HealthCheckQuery, HealthCheckQueryVariables>(HealthCheckDocument, options);
      }
export function useHealthCheckLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HealthCheckQuery, HealthCheckQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HealthCheckQuery, HealthCheckQueryVariables>(HealthCheckDocument, options);
        }
export function useHealthCheckSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HealthCheckQuery, HealthCheckQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HealthCheckQuery, HealthCheckQueryVariables>(HealthCheckDocument, options);
        }
export type HealthCheckQueryHookResult = ReturnType<typeof useHealthCheckQuery>;
export type HealthCheckLazyQueryHookResult = ReturnType<typeof useHealthCheckLazyQuery>;
export type HealthCheckSuspenseQueryHookResult = ReturnType<typeof useHealthCheckSuspenseQuery>;
export type HealthCheckQueryResult = Apollo.QueryResult<HealthCheckQuery, HealthCheckQueryVariables>;
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

/**
 * __useMySubscriptionsQuery__
 *
 * To run a query within a React component, call `useMySubscriptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMySubscriptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMySubscriptionsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      nextToken: // value for 'nextToken'
 *   },
 * });
 */
export function useMySubscriptionsQuery(baseOptions?: Apollo.QueryHookOptions<MySubscriptionsQuery, MySubscriptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MySubscriptionsQuery, MySubscriptionsQueryVariables>(MySubscriptionsDocument, options);
      }
export function useMySubscriptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MySubscriptionsQuery, MySubscriptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MySubscriptionsQuery, MySubscriptionsQueryVariables>(MySubscriptionsDocument, options);
        }
export function useMySubscriptionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MySubscriptionsQuery, MySubscriptionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MySubscriptionsQuery, MySubscriptionsQueryVariables>(MySubscriptionsDocument, options);
        }
export type MySubscriptionsQueryHookResult = ReturnType<typeof useMySubscriptionsQuery>;
export type MySubscriptionsLazyQueryHookResult = ReturnType<typeof useMySubscriptionsLazyQuery>;
export type MySubscriptionsSuspenseQueryHookResult = ReturnType<typeof useMySubscriptionsSuspenseQuery>;
export type MySubscriptionsQueryResult = Apollo.QueryResult<MySubscriptionsQuery, MySubscriptionsQueryVariables>;
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

/**
 * __useEpisodesByShowQuery__
 *
 * To run a query within a React component, call `useEpisodesByShowQuery` and pass it any options that fit your needs.
 * When your component renders, `useEpisodesByShowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEpisodesByShowQuery({
 *   variables: {
 *      showId: // value for 'showId'
 *      limit: // value for 'limit'
 *      nextToken: // value for 'nextToken'
 *   },
 * });
 */
export function useEpisodesByShowQuery(baseOptions: Apollo.QueryHookOptions<EpisodesByShowQuery, EpisodesByShowQueryVariables> & ({ variables: EpisodesByShowQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EpisodesByShowQuery, EpisodesByShowQueryVariables>(EpisodesByShowDocument, options);
      }
export function useEpisodesByShowLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EpisodesByShowQuery, EpisodesByShowQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EpisodesByShowQuery, EpisodesByShowQueryVariables>(EpisodesByShowDocument, options);
        }
export function useEpisodesByShowSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EpisodesByShowQuery, EpisodesByShowQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EpisodesByShowQuery, EpisodesByShowQueryVariables>(EpisodesByShowDocument, options);
        }
export type EpisodesByShowQueryHookResult = ReturnType<typeof useEpisodesByShowQuery>;
export type EpisodesByShowLazyQueryHookResult = ReturnType<typeof useEpisodesByShowLazyQuery>;
export type EpisodesByShowSuspenseQueryHookResult = ReturnType<typeof useEpisodesByShowSuspenseQuery>;
export type EpisodesByShowQueryResult = Apollo.QueryResult<EpisodesByShowQuery, EpisodesByShowQueryVariables>;
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

/**
 * __useSearchShowsQuery__
 *
 * To run a query within a React component, call `useSearchShowsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchShowsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchShowsQuery({
 *   variables: {
 *      term: // value for 'term'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useSearchShowsQuery(baseOptions: Apollo.QueryHookOptions<SearchShowsQuery, SearchShowsQueryVariables> & ({ variables: SearchShowsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchShowsQuery, SearchShowsQueryVariables>(SearchShowsDocument, options);
      }
export function useSearchShowsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchShowsQuery, SearchShowsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchShowsQuery, SearchShowsQueryVariables>(SearchShowsDocument, options);
        }
export function useSearchShowsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchShowsQuery, SearchShowsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchShowsQuery, SearchShowsQueryVariables>(SearchShowsDocument, options);
        }
export type SearchShowsQueryHookResult = ReturnType<typeof useSearchShowsQuery>;
export type SearchShowsLazyQueryHookResult = ReturnType<typeof useSearchShowsLazyQuery>;
export type SearchShowsSuspenseQueryHookResult = ReturnType<typeof useSearchShowsSuspenseQuery>;
export type SearchShowsQueryResult = Apollo.QueryResult<SearchShowsQuery, SearchShowsQueryVariables>;
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
export type SubscribeToShowMutationFn = Apollo.MutationFunction<SubscribeToShowMutation, SubscribeToShowMutationVariables>;

/**
 * __useSubscribeToShowMutation__
 *
 * To run a mutation, you first call `useSubscribeToShowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSubscribeToShowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [subscribeToShowMutation, { data, loading, error }] = useSubscribeToShowMutation({
 *   variables: {
 *      showId: // value for 'showId'
 *      title: // value for 'title'
 *      publisher: // value for 'publisher'
 *      image: // value for 'image'
 *   },
 * });
 */
export function useSubscribeToShowMutation(baseOptions?: Apollo.MutationHookOptions<SubscribeToShowMutation, SubscribeToShowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SubscribeToShowMutation, SubscribeToShowMutationVariables>(SubscribeToShowDocument, options);
      }
export type SubscribeToShowMutationHookResult = ReturnType<typeof useSubscribeToShowMutation>;
export type SubscribeToShowMutationResult = Apollo.MutationResult<SubscribeToShowMutation>;
export type SubscribeToShowMutationOptions = Apollo.BaseMutationOptions<SubscribeToShowMutation, SubscribeToShowMutationVariables>;
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
export type MarkEpisodeProgressMutationFn = Apollo.MutationFunction<MarkEpisodeProgressMutation, MarkEpisodeProgressMutationVariables>;

/**
 * __useMarkEpisodeProgressMutation__
 *
 * To run a mutation, you first call `useMarkEpisodeProgressMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkEpisodeProgressMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markEpisodeProgressMutation, { data, loading, error }] = useMarkEpisodeProgressMutation({
 *   variables: {
 *      episodeId: // value for 'episodeId'
 *      positionSec: // value for 'positionSec'
 *      completed: // value for 'completed'
 *   },
 * });
 */
export function useMarkEpisodeProgressMutation(baseOptions?: Apollo.MutationHookOptions<MarkEpisodeProgressMutation, MarkEpisodeProgressMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MarkEpisodeProgressMutation, MarkEpisodeProgressMutationVariables>(MarkEpisodeProgressDocument, options);
      }
export type MarkEpisodeProgressMutationHookResult = ReturnType<typeof useMarkEpisodeProgressMutation>;
export type MarkEpisodeProgressMutationResult = Apollo.MutationResult<MarkEpisodeProgressMutation>;
export type MarkEpisodeProgressMutationOptions = Apollo.BaseMutationOptions<MarkEpisodeProgressMutation, MarkEpisodeProgressMutationVariables>;
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
export type PublishProgressUpdateMutationFn = Apollo.MutationFunction<PublishProgressUpdateMutation, PublishProgressUpdateMutationVariables>;

/**
 * __usePublishProgressUpdateMutation__
 *
 * To run a mutation, you first call `usePublishProgressUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishProgressUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishProgressUpdateMutation, { data, loading, error }] = usePublishProgressUpdateMutation({
 *   variables: {
 *      episodeId: // value for 'episodeId'
 *      positionSec: // value for 'positionSec'
 *      completed: // value for 'completed'
 *   },
 * });
 */
export function usePublishProgressUpdateMutation(baseOptions?: Apollo.MutationHookOptions<PublishProgressUpdateMutation, PublishProgressUpdateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PublishProgressUpdateMutation, PublishProgressUpdateMutationVariables>(PublishProgressUpdateDocument, options);
      }
export type PublishProgressUpdateMutationHookResult = ReturnType<typeof usePublishProgressUpdateMutation>;
export type PublishProgressUpdateMutationResult = Apollo.MutationResult<PublishProgressUpdateMutation>;
export type PublishProgressUpdateMutationOptions = Apollo.BaseMutationOptions<PublishProgressUpdateMutation, PublishProgressUpdateMutationVariables>;
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

/**
 * __useOnProgressSubscription__
 *
 * To run a query within a React component, call `useOnProgressSubscription` and pass it any options that fit your needs.
 * When your component renders, `useOnProgressSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOnProgressSubscription({
 *   variables: {
 *      episodeId: // value for 'episodeId'
 *   },
 * });
 */
export function useOnProgressSubscription(baseOptions: Apollo.SubscriptionHookOptions<OnProgressSubscription, OnProgressSubscriptionVariables> & ({ variables: OnProgressSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<OnProgressSubscription, OnProgressSubscriptionVariables>(OnProgressDocument, options);
      }
export type OnProgressSubscriptionHookResult = ReturnType<typeof useOnProgressSubscription>;
export type OnProgressSubscriptionResult = Apollo.SubscriptionResult<OnProgressSubscription>;