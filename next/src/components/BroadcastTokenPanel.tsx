'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'
import {
  TrashIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid'

import Panel from '@/components/Panel'
import Button from '@/components/Button'
import Input from '@/components/Input'
import {
  getBroadcastTokens,
  createBroadcastToken,
  deleteBroadcastToken,
  type BroadcastToken,
} from '@/actions/tokenActions'

type TokenWithValue = BroadcastToken & { tokenValue?: string }

type BroadcastTokenPanelProps = {
  broadcastId: string
  className?: string
}

const BroadcastTokenPanel: React.FC<BroadcastTokenPanelProps> = ({
  broadcastId,
  className,
}) => {
  const [tokens, setTokens] = useState<TokenWithValue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTokenName, setNewTokenName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [visibleTokenId, setVisibleTokenId] = useState<string | null>(null)

  const fetchTokens = async () => {
    try {
      const data = await getBroadcastTokens(broadcastId)
      setTokens(data.map((t) => ({ ...t, tokenValue: undefined })))
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [broadcastId])

  const handleCreate = async () => {
    if (!newTokenName.trim()) return

    setIsCreating(true)
    try {
      const result = await createBroadcastToken(broadcastId, newTokenName.trim())
      setTokens((prev) => [
        { ...result, createdAt: new Date().toISOString(), lastUsedAt: null, tokenValue: result.token },
        ...prev,
      ])
      setNewTokenName('')
      setVisibleTokenId(result.id)
    } catch {
      // ignore
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (tokenId: string) => {
    if (!confirm('このトークンを削除しますか？')) return

    try {
      await deleteBroadcastToken(broadcastId, tokenId)
      setTokens((prev) => prev.filter((t) => t.id !== tokenId))
    } catch {
      // ignore
    }
  }

  const handleCopy = async (tokenValue: string, tokenId: string) => {
    await navigator.clipboard.writeText(tokenValue)
    setCopiedId(tokenId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return (
      <Panel panelTitle='配信トークン' className={clsx(className)}>
        <p>読み込み中...</p>
      </Panel>
    )
  }

  return (
    <Panel panelTitle='配信トークン' className={clsx(className)}>
      <div className='flex flex-col gap-4 p-2'>
        <p className='text-sm text-gray-500'>
          OBS等から配信する際に使用するトークンです。Bearer認証で使用します。
        </p>

        {/* 新規作成フォーム */}
        <div className='flex flex-row gap-2'>
          <Input
            type='text'
            placeholder='トークン名'
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            className='flex-1'
            data-testid="token-name-input"
            aria-label="トークン名"
          />
          <Button
            onClick={handleCreate}
            disabled={isCreating || !newTokenName.trim()}
            data-testid="token-create-button"
            aria-label="トークンを作成"
          >
            <PlusIcon className='size-5' />
            作成
          </Button>
        </div>

        {/* トークン一覧 */}
        {tokens.length === 0 ? (
          <p className='text-sm text-gray-500'>
            トークンがありません。新しいトークンを作成してください。
          </p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {tokens.map((token) => (
              <li
                key={token.id}
                className={clsx(
                  'flex flex-col gap-2 p-2 bg-primary rounded-md'
                )}
              >
                <div className='flex flex-row items-center gap-2'>
                  <span className='font-medium'>{token.name}</span>
                  <span className='text-xs text-gray-500 ml-auto'>
                    作成: {new Date(token.createdAt).toLocaleDateString()}
                  </span>
                  {token.lastUsedAt && (
                    <span className='text-xs text-gray-500'>
                      最終使用: {new Date(token.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* トークン値の表示（新規作成時のみ） */}
                {token.tokenValue && (
                  <div className='flex flex-row items-center gap-2 bg-yellow-50 p-2 rounded'>
                    <code className='text-xs flex-1 break-all'>
                      {visibleTokenId === token.id
                        ? token.tokenValue
                        : '••••••••••••••••••••••••••••••••'}
                    </code>
                    <Button
                      onClick={() =>
                        setVisibleTokenId(
                          visibleTokenId === token.id ? null : token.id
                        )
                      }
                      aria-label={
                        visibleTokenId === token.id ? '非表示' : '表示'
                      }
                    >
                      {visibleTokenId === token.id ? (
                        <EyeSlashIcon className='size-4' />
                      ) : (
                        <EyeIcon className='size-4' />
                      )}
                    </Button>
                    <Button
                      onClick={() => handleCopy(token.tokenValue!, token.id)}
                      aria-label={
                        copiedId === token.id ? 'コピー済み' : 'コピー'
                      }
                    >
                      {copiedId === token.id ? (
                        <ClipboardDocumentCheckIcon className='size-4' />
                      ) : (
                        <ClipboardDocumentIcon className='size-4' />
                      )}
                    </Button>
                  </div>
                )}

                <div className='flex flex-row items-center gap-2'>
                  {!token.tokenValue && (
                    <span className='text-xs text-gray-500'>
                      トークン値は作成時のみ表示されます
                    </span>
                  )}
                  <Button
                    onClick={() => handleDelete(token.id)}
                    className='ml-auto bg-danger hover:bg-red-700'
                  >
                    <TrashIcon className='size-4' />
                    削除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}

export default BroadcastTokenPanel
