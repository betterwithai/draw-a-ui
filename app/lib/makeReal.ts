import { Editor, createShapeId, getSvgAsImage } from '@tldraw/tldraw'
import { PreviewShape } from '../PreviewShape/PreviewShape'
// import { getHtmlFromOpenAI } from './getHtmlFromOpenAI'

async function callToHtmlApi(image, html, apiKey) {
    const response = await fetch('/api/toHtml/route', { // Adjust the path if necessary
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image, html, apiKey }),
    });

    if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
    }

    return await response.json();
}

export async function makeReal(editor: Editor, apiKey: string) {
	const newShapeId = createShapeId()
	const selectedShapes = editor.getSelectedShapes()

	if (selectedShapes.length === 0) {
		throw Error('First select something to make real.')
	}

	const previewPosition = selectedShapes.reduce(
		(acc, shape) => {
			const bounds = editor.getShapePageBounds(shape)
			const right = bounds?.maxX ?? 0
			const top = bounds?.minY ?? 0
			return {
				x: Math.max(acc.x, right),
				y: Math.min(acc.y, top),
			}
		},
		{ x: 0, y: Infinity }
	)

	const previousPreviews = selectedShapes.filter((shape) => {
		return shape.type === 'preview'
	}) as PreviewShape[]

	if (previousPreviews.length > 1) {
		throw Error(`You can only have one previous design selected.`)
	}

	const previousHtml =
		previousPreviews.length === 1
			? previousPreviews[0].props.html
			: 'No previous design has been provided this time.'

	const svg = await editor.getSvg(selectedShapes)
	if (!svg) throw Error(`Could not get the SVG.`)

	const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

	const blob = await getSvgAsImage(svg, IS_SAFARI, {
		type: 'png',
		quality: 1,
		scale: 1,
	})

	const dataUrl = await blobToBase64(blob!)

	editor.createShape<PreviewShape>({
		id: newShapeId,
		type: 'preview',
		x: previewPosition.x + 60,
		y: previewPosition.y,
		props: { html: '', source: dataUrl as string },
	})

	try {
		// Call the API route
		const response = await fetch('/api/toHtml/route', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				image: dataUrl,
				html: previousHtml,
				apiKey,
			}),
		});
	
		const json = await response.json();
	
		if (json.error) {
			throw new Error(`${json.error.message?.slice(0, 100)}...`);
		}
	
		const message = json.choices[0].message.content;
		const start = message.indexOf('<!DOCTYPE html>');
		const end = message.indexOf('</html>');
		const html = message.slice(start, end + '</html>'.length);
	
		editor.updateShape<PreviewShape>({
			id: newShapeId,
			type: 'preview',
			props: { html, source: dataUrl as string },
		});
	} catch (e) {
		editor.deleteShape(newShapeId);
		throw e;
	}
	
}

export function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, _) => {
		const reader = new FileReader()
		reader.onloadend = () => resolve(reader.result as string)
		reader.readAsDataURL(blob)
	})
}
