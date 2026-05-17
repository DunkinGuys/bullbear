import { NextResponse } from 'next/server';

function closed() {
  return NextResponse.json(
    {
      error: 'gone',
      message: 'BullBear has ended. API activity and trading flows are closed.',
    },
    { status: 410 }
  );
}

export const GET = closed;
export const POST = closed;
export const PUT = closed;
export const PATCH = closed;
export const DELETE = closed;
export const OPTIONS = closed;

