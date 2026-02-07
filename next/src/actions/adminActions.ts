'use server'

import {
  getUsers as getUsersInternal,
  setUserApproval as setUserApprovalInternal,
} from '@/lib/admin'

export const getUsers = async () => await getUsersInternal()

export const setUserApproval = async (
  userId: string,
  isApproved: boolean,
) => await setUserApprovalInternal(userId, isApproved)
