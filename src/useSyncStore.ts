import {
	HistoryEntry,
	StoreListener,
	TLRecord,
	TLStoreWithStatus,
	createTLStore,
	defaultShapeUtils,
} from '@tldraw/tldraw'
import { useEffect, useMemo, useState } from 'react'
import PartySocket from 'partysocket'

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

	const socket = useMemo(() => {
		return new PartySocket({ host: hostUrl, room: `${roomId}_${version}` })
	}, [hostUrl, roomId, version])

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
				if (data.clientId === socket.id) return

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
							store.mergeRemoteChanges(() => {
								const {
									changes: { added, updated, removed },
								} = data.update as HistoryEntry<TLRecord>

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
						} catch (e) {
							console.error(e)
							socket.send(JSON.stringify({ type: 'recovery' }))
						}
						break
					}
				}
			} catch (e) {
				console.error(e)
			}
		}

		const handleChange: StoreListener<TLRecord> = (event) => {
			if (event.source !== 'user') return
			socket.send(
				JSON.stringify({ clientId: socket.id, type: 'update', update: event })
			)
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
