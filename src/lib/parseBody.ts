import { NextRequest, NextResponse } from 'next/server';

/**
 * Safely parse JSON body from a request.
 * Returns the parsed body or a 400 NextResponse on failure.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: NextRequest,
): Promise<T | NextResponse> {
  try {
    return await request.json() as T;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }
}

export function isParseError(value: unknown): value is NextResponse {
  return value instanceof NextResponse || value instanceof Response;
}
