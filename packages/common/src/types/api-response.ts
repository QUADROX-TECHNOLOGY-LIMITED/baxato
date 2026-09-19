export interface ApiMeta {
  requestId: string;
  timestamp: string;
  durationMs?: number;
  environment?: string;
  version?: string;
}

export interface ApiPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiErrorDetails {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetails;
  meta: ApiMeta;
  pagination?: ApiPagination;
}

export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  pagination?: ApiPagination,
  durationMs?: number,
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...(durationMs !== undefined ? { durationMs } : {}),
    },
    ...(pagination ? { pagination } : {}),
  };
}

export function createErrorResponse(
  error: ApiErrorDetails,
  requestId: string,
  durationMs?: number,
): ApiResponse<null> {
  return {
    success: false,
    error,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...(durationMs !== undefined ? { durationMs } : {}),
    },
  };
}
