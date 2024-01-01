import {
	HistoryEntry,
	StoreListener,
	TLRecord,
	TLStoreWithStatus,
	createTLStore,
	defaultShapeUtils,
	throttle,
	uniqueId,
} from '@tldraw/tldraw'
import { useEffect, useState } from 'react'
import { usePartySocket } from 'partysocket/react'

const clientId = uniqueId()

export function useSyncStore({
	hostUrl,
	version = 1,
	roomId = 'example',
}: {
	hostUrl: string
	version?: number
	roomId?: string
}) {
	const [store] = useState(() => {
		const store = createTLStore({
			shapeUtils: [...defaultShapeUtils],
		})
		// store.loadSnapshot(DEFAULT_STORE)
		return store
	})

	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
		status: 'loading',
	})

	const socket = usePartySocket({
		host: hostUrl,
		room: `${roomId}_${version}`,
	})

	useEffect(() => {
		setStoreWithStatus({ status: 'loading' })

		const unsubs: (() => void)[] = []

		const handleOpen = () => {
			socket.removeEventListener('open', handleOpen)

			setStoreWithStatus({
				status: 'synced-remote',
				connectionStatus: 'online',
				store,
			})

			socket.addEventListener('message', handleMessage)
			unsubs.push(() => socket.removeEventListener('message', handleMessage))
		}

		const handleClose = () => {
			socket.removeEventListener('message', handleMessage)

			setStoreWithStatus({
				status: 'synced-remote',
				connectionStatus: 'offline',
				store,
			})

			socket.addEventListener('open', handleOpen)
		}

		const handleMessage = (message: MessageEvent<any>) => {
			try {
				const data = JSON.parse(message.data)
				if (data.clientId === clientId) {
					return
				}

				switch (data.type) {
					case 'init': {
						store.loadSnapshot(data.snapshot)
						break
					}
					case 'recovery': {
						store.loadSnapshot(data.snapshot)
						break
					}
					case 'update': {
						try {
							for (const update of data.updates) {
								store.mergeRemoteChanges(() => {
									const {
										changes: { added, updated, removed },
									} = update as HistoryEntry<TLRecord>

									for (const record of Object.values(added)) {
										store.put([record])
									}
									for (const [, to] of Object.values(updated)) {
										store.put([to])
									}
									for (const record of Object.values(removed)) {
										store.remove([record.id])
									}
								})
							}
						} catch (e) {
							console.error(e)
							socket.send(JSON.stringify({ clientId, type: 'recovery' }))
						}
						break
					}
				}
			} catch (e) {
				console.error(e)
			}
		}

		const pendingChanges: HistoryEntry<TLRecord>[] = []

		const sendChanges = throttle(() => {
			if (pendingChanges.length === 0) return
			socket.send(
				JSON.stringify({
					clientId,
					type: 'update',
					updates: pendingChanges,
				})
			)
			pendingChanges.length = 0
		}, 32)

		const handleChange: StoreListener<TLRecord> = (event) => {
			if (event.source !== 'user') return
			pendingChanges.push(event)
			sendChanges()
		}

		socket.addEventListener('open', handleOpen)
		socket.addEventListener('close', handleClose)

		unsubs.push(
			store.listen(handleChange, {
				source: 'user',
				scope: 'document',
			})
		)

		// unsubs.push(
		// 	store.listen(handleChange, {
		// 		source: 'user',
		// 		scope: 'presence',
		// 	})
		// )

		unsubs.push(() => socket.removeEventListener('open', handleOpen))
		unsubs.push(() => socket.removeEventListener('close', handleClose))

		return () => {
			unsubs.forEach((fn) => fn())
			unsubs.length = 0
		}
	}, [socket, store])

	return storeWithStatus
}
