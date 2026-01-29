export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function getPaginationParams(params?: PaginationParams): { skip: number; take: number } {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const skip = params?.skip ?? (page - 1) * limit;
  const take = params?.take ?? limit;

  return { skip, take };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params?: PaginationParams
): PaginatedResponse<T> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
