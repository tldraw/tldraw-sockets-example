export const schema = {
	schemaVersion: 1,
	storeVersion: 4,
	recordVersions: {
		asset: {
			version: 1,
			subTypeKey: 'type',
			subTypeVersions: {
				image: 2,
				video: 2,
				bookmark: 0,
			},
		},
		camera: {
			version: 1,
		},
		document: {
			version: 2,
		},
		instance: {
			version: 22,
		},
		instance_page_state: {
			version: 5,
		},
		page: {
			version: 1,
		},
		shape: {
			version: 3,
			subTypeKey: 'type',
			subTypeVersions: {
				group: 0,
				text: 1,
				bookmark: 1,
				draw: 1,
				geo: 7,
				note: 4,
				line: 1,
				frame: 0,
				arrow: 2,
				highlight: 0,
				embed: 4,
				image: 2,
				video: 1,
			},
		},
		instance_presence: {
			version: 5,
		},
		pointer: {
			version: 1,
		},
	},
}
