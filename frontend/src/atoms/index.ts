import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// ── Auth atoms ────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number
  full_name: string
  email: string
  role: 'admin' | 'instructor' | 'student'
  bio?: string
  phone?: string
  avatar?: string
}

const getInitialValue = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

export const accessTokenAtom = atomWithStorage<string | null>('lms_access_token', getInitialValue('lms_access_token', null))
export const refreshTokenAtom = atomWithStorage<string | null>('lms_refresh_token', getInitialValue('lms_refresh_token', null))
export const currentUserAtom = atomWithStorage<AuthUser | null>('lms_user', getInitialValue('lms_user', null))
export const isAuthenticatedAtom = atom((get) => !!get(accessTokenAtom) && !!get(currentUserAtom))

// ── UI atoms ──────────────────────────────────────────────────────────────────
export const sidebarOpenAtom = atom(true)
export const loadingAtom = atom(false)

// ── Toast atoms ───────────────────────────────────────────────────────────────
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
export const toastsAtom = atom<Toast[]>([])

// ── Filter/search atoms ───────────────────────────────────────────────────────
export const courseSearchAtom = atom('')
export const courseLevelFilterAtom = atom('')
export const courseCategoryFilterAtom = atom<number | null>(null)
export const userSearchAtom = atom('')
export const userRoleFilterAtom = atom('')
