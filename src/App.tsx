import { Tldraw, track, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useSyncStore } from './useSyncStore'

const HOST_URL = import.meta.env.DEV
	? 'ws://localhost:1999'
	: import.meta.env.VITE_PRODUCTION_URL.replace('https://', 'ws://') // remove protocol just in case

export default function SyncExample() {
	const store = useSyncStore({
		roomId: 'example',
		hostUrl: HOST_URL,
	})

	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus store={store} shareZone={<NameEditor />} />
		</div>
	)
}

const NameEditor = track(() => {
	const editor = useEditor()

	const { color, name } = editor.user

	return (
		<div style={{ pointerEvents: 'all', display: 'flex' }}>
			<input
				type="color"
				value={color}
				onChange={(e) => {
					editor.user.updateUserPreferences({
						color: e.currentTarget.value,
					})
				}}
			/>
			<input
				value={name}
				onChange={(e) => {
					editor.user.updateUserPreferences({
						name: e.currentTarget.value,
					})
				}}
			/>
		</div>
	)
})
