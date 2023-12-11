import { HistoryEntry, TLRecord } from '@tldraw/tldraw'
import { schema } from './server-schema'
import type * as Party from 'partykit/server'

export default class SyncParty implements Party.Server {
	records: Record<string, TLRecord> = {}

	constructor(public party: Party.Party) {}

	async onConnect(connection: Party.Connection<unknown>) {
		connection.send(
			JSON.stringify({
				type: 'init',
				snapshot: { store: this.records, schema },
			})
		)
	}

	onMessage(
		message: string,
		sender: Party.Connection<unknown>
	): void | Promise<void> {
		const msg = JSON.parse(message as string)
		switch (msg.type) {
			case 'update': {
				try {
					for (const update of msg.updates) {
						const {
							changes: { added, updated, removed },
						} = update as HistoryEntry<TLRecord>
						// Try to merge the update into our local store
						for (const record of Object.values(added)) {
							this.records[record.id] = record
						}
						for (const [, to] of Object.values(updated)) {
							this.records[to.id] = to
						}
						for (const record of Object.values(removed)) {
							delete this.records[record.id]
						}
					}
					// If it works, broadcast the update to all other clients
					this.party.broadcast(message, [sender.id])
				} catch (err) {
					// If we have a problem merging the update, we need to send a snapshot
					// of the current state to the client so they can get back in sync.
					sender.send(
						JSON.stringify({
							type: 'recovery',
							snapshot: { store: this.records, schema },
						})
					)
				}
				break
			}
			case 'recovery': {
				// If the client asks for a recovery, send them a snapshot of the current state
				sender.send(
					JSON.stringify({
						type: 'recovery',
						snapshot: { store: this.records, schema },
					})
				)
				break
			}
		}
	}
}
