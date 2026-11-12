/**
 * Friendly names for the API types generated from the backend's OpenAPI document.
 * Never edit `schema.d.ts` by hand; run `npm run gen:api` after changing the API.
 */
import type { components, operations } from './schema';

type Schemas = components['schemas'];

export type AnalysisRequest = Schemas['AnalysisRequest'];
export type AnalysisStatus = Schemas['AnalysisStatus'];
export type JobState = Schemas['JobState'];
export type Summary = Schemas['Summary'];
export type TreeNode = Schemas['TreeNodeOut'];
export type TreeChildren = Schemas['TreeChildren'];
export type ElementSummary = Schemas['ElementSummary'];
export type ElementDetail = Schemas['ElementDetail'];
export type ElementRef = Schemas['ElementRef'];
export type ElementPage = Schemas['ElementPage'];
export type ElementType = Schemas['ElementType'];
export type Parameter = Schemas['ParameterOut'];
export type Usage = Schemas['UsageOut'];
export type UsagePage = Schemas['UsagePage'];
export type UsageType = Schemas['UsageType'];
export type SearchPage = Schemas['SearchPage'];
export type SearchResult = Schemas['SearchResult'];
export type Graph = Schemas['GraphOut'];
export type GraphNode = Schemas['GraphNodeOut'];
export type GraphEdge = Schemas['GraphEdgeOut'];
export type Issue = Schemas['IssueOut'];
export type IssuePage = Schemas['IssuePage'];
export type IssueKind = Schemas['IssueKind'];
export type Severity = Schemas['Severity'];
export type CycleList = Schemas['CycleList'];
export type PatternList = Schemas['PatternList'];
export type Pattern = Schemas['PatternOut'];
export type Source = Schemas['SourceOut'];
export type Health = Schemas['Health'];

export type GraphLevel = NonNullable<
  NonNullable<operations['graph_api_graph_get']['parameters']['query']>['level']
>;
