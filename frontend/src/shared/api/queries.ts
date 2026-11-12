/** React Query hooks: one per API endpoint. All server state lives here. */
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { ApiError, compact, request } from './client';
import type {
  AnalysisRequest,
  AnalysisStatus,
  CycleList,
  ElementDetail,
  ElementPage,
  ElementType,
  Graph,
  GraphLevel,
  IssueKind,
  IssuePage,
  PatternList,
  SearchPage,
  Severity,
  Source,
  Summary,
  TreeChildren,
  UsagePage,
  UsageType,
} from './types';

export const STATUS_KEY = ['analysis-status'] as const;
/** Prefix of every query whose data belongs to the current analysis. */
export const DATA_KEY = ['analysis-data'] as const;
export const STATUS_POLL_MS = 400;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity, // analysis data only changes when a new analysis completes
        refetchOnWindowFocus: false,
        retry: (failures, error) =>
          failures < 2 && (!(error instanceof ApiError) || error.retryable),
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
      },
    },
  });
}

// ---------------------------------------------------------------- lifecycle

export function useAnalysisStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: ({ signal }) => request<AnalysisStatus>({ url: '/analysis', signal }),
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.state === 'running' ? STATUS_POLL_MS : false),
  });
}

function useStatusMutation<TVariables>(send: (variables: TVariables) => Promise<AnalysisStatus>) {
  const client = useQueryClient();
  return useMutation<AnalysisStatus, ApiError, TVariables>({
    mutationFn: send,
    onSuccess: (status) => {
      client.setQueryData(STATUS_KEY, status);
      if (!status.has_result) client.removeQueries({ queryKey: DATA_KEY });
    },
  });
}

export function useStartAnalysis() {
  return useStatusMutation((body: AnalysisRequest) =>
    request<AnalysisStatus>({ url: '/analysis', method: 'POST', data: body }),
  );
}

export function useCancelAnalysis() {
  return useStatusMutation((_: void) =>
    request<AnalysisStatus>({ url: '/analysis/cancel', method: 'POST' }),
  );
}

export function useResetAnalysis() {
  return useStatusMutation((_: void) =>
    request<AnalysisStatus>({ url: '/analysis', method: 'DELETE' }),
  );
}

// --------------------------------------------------------------------- reads

interface Enabled {
  enabled?: boolean;
}

export function useSummary({ enabled = true }: Enabled = {}) {
  return useQuery({
    queryKey: [...DATA_KEY, 'summary'],
    queryFn: ({ signal }) => request<Summary>({ url: '/summary', signal }),
    enabled,
  });
}

export function treeQuery(parent: string) {
  return {
    queryKey: [...DATA_KEY, 'tree', parent],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      request<TreeChildren>({ url: '/tree', params: { parent }, signal }),
  };
}

export interface ElementFilters {
  type?: ElementType | undefined;
  file?: string | undefined;
}

const PAGE_SIZE = 100;

export function useElements(filters: ElementFilters, { enabled = true }: Enabled = {}) {
  return useInfiniteQuery({
    queryKey: [...DATA_KEY, 'elements', filters],
    queryFn: ({ pageParam, signal }) =>
      request<ElementPage>({
        url: '/elements',
        params: compact({ ...filters, offset: pageParam, limit: PAGE_SIZE }),
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.next_offset ?? undefined,
    enabled,
  });
}

export function useElement(id: string | null) {
  return useQuery({
    queryKey: [...DATA_KEY, 'element', id],
    queryFn: ({ signal }) => request<ElementDetail>({ url: '/element', params: { id }, signal }),
    enabled: id !== null,
  });
}

export interface UsageFilters {
  type?: UsageType | undefined;
  file?: string | undefined;
}

export function useUsages(id: string, filters: UsageFilters) {
  return useInfiniteQuery({
    queryKey: [...DATA_KEY, 'usages', id, filters],
    queryFn: ({ pageParam, signal }) =>
      request<UsagePage>({
        url: '/usages',
        params: compact({ id, ...filters, offset: pageParam, limit: 50 }),
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.next_offset ?? undefined,
    placeholderData: keepPreviousData,
  });
}

export interface SearchFilters {
  q: string;
  type?: ElementType | undefined;
  docstrings?: boolean | undefined;
}

export function useSearch(filters: SearchFilters) {
  const query = filters.q.trim();
  return useInfiniteQuery({
    queryKey: [...DATA_KEY, 'search', { ...filters, q: query }],
    queryFn: ({ pageParam, signal }) =>
      request<SearchPage>({
        url: '/search',
        params: compact({ ...filters, q: query, offset: pageParam, limit: 50 }),
        signal, // typing again aborts the request for the previous query
      }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.next_offset ?? undefined,
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });
}

export interface GraphParams {
  level: GraphLevel;
  package_depth?: number | undefined;
  focus?: string | undefined;
  depth?: number | undefined;
  max_nodes?: number | undefined;
}

export function useGraph(params: GraphParams) {
  return useQuery({
    queryKey: [...DATA_KEY, 'graph', params],
    queryFn: ({ signal }) =>
      request<Graph>({ url: '/graph', params: compact({ ...params }), signal }),
    placeholderData: keepPreviousData,
  });
}

export interface IssueFilters {
  kind?: IssueKind | undefined;
  severity?: Severity | undefined;
}

export function useIssues(filters: IssueFilters) {
  return useInfiniteQuery({
    queryKey: [...DATA_KEY, 'issues', filters],
    queryFn: ({ pageParam, signal }) =>
      request<IssuePage>({
        url: '/issues',
        params: compact({ ...filters, offset: pageParam, limit: PAGE_SIZE }),
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.next_offset ?? undefined,
    placeholderData: keepPreviousData,
  });
}

export function useCycles() {
  return useQuery({
    queryKey: [...DATA_KEY, 'cycles'],
    queryFn: ({ signal }) => request<CycleList>({ url: '/cycles', signal }),
  });
}

export function usePatterns() {
  return useQuery({
    queryKey: [...DATA_KEY, 'patterns'],
    queryFn: ({ signal }) => request<PatternList>({ url: '/patterns', signal }),
  });
}

export interface SourceRange {
  file: string;
  start: number;
  end: number;
}

export function useSource(range: SourceRange | null) {
  return useQuery({
    queryKey: [...DATA_KEY, 'source', range],
    queryFn: ({ signal }) => request<Source>({ url: '/source', params: { ...range }, signal }),
    enabled: range !== null,
  });
}
