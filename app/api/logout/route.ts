import { NextResponse } from 'next/server'
import { deleteSessionUser } from '@/lib/auth'

export async function POST() {
  await deleteSessionUser()
  return NextResponse.json({ success: true })
}
