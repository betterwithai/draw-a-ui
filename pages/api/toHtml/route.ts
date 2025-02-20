import type { NextApiRequest, NextApiResponse } from 'next';


const systemPrompt = `You are an expert web developer who specializes in tailwind css.
A user will provide you with a low-fidelity wireframe of an application. 
You will return a single html file that uses HTML, tailwind css, and JavaScript to create a high fidelity website.
Include any extra CSS and JavaScript in the html file.
If you have any images, load them from Unsplash or use solid colored retangles.
The user will provide you with notes in blue or red text, arrows, or drawings.
The user may also include images of other websites as style references. Transfer the styles as best as you can, matching fonts / colors / layouts.
They may also provide you with the html of a previous design that they want you to iterate from.
Carry out any changes they request from you.
In the wireframe, the previous design's html will appear as a white rectangle.
Use creative license to make the application more fleshed out.
Use JavaScript modules and unkpkg to import any necessary dependencies.

Respond ONLY with the contents of the html file.`
  

export async function getHtmlFromOpenAI({
	image,
	html,
	apiKey,
}: {
	image: string
	html: string
	apiKey: string
}) {
	const body: GPT4VCompletionRequest = {
		model: 'gpt-4-vision-preview',
		max_tokens: 4096,
		temperature: 0,
		messages: [
			{
				role: 'system',
				content: systemPrompt,
			},
			{
				role: 'user',
				content: [
					{
						type: 'image_url',
						image_url: {
							url: image,
							detail: 'high',
						},
					},
					{
						type: 'text',
						text: 'Turn this into a single html file using tailwind.',
					},
					{
						type: 'text',
						text: html,
					},
				],
			},
		],
	}

	let json = null
	let used_api_key;
	let openAIKey = process.env.OPENAI_API_KEY

	if (!openAIKey) {
		console.log('No OPENAI_API_KEY environment variable found, using provided key')
		console.log('Provided env sanity check (username): ', process.env.BASIC_AUTH_USERNAME)
		if (!apiKey) {
			throw new Error('No API key provided in env or ui, please enter your key!');
		} else {
			used_api_key = apiKey;
		}
	} else {
		used_api_key = openAIKey;
	}
	

	try {
		const resp = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${used_api_key}`,
			},
			body: JSON.stringify(body),
		})
		console.log(resp)
		json = await resp.json()
	} catch (e) {
		console.log(e)
	}

	return json
}

type MessageContent =
	| string
	| (
			| string
			| {
					type: 'image_url'
					image_url:
						| string
						| {
								url: string
								detail: 'low' | 'high' | 'auto'
						  }
			  }
			| {
					type: 'text'
					text: string
			  }
	  )[]

export type GPT4VCompletionRequest = {
	model: 'gpt-4-vision-preview'
	messages: {
		role: 'system' | 'user' | 'assistant' | 'function'
		content: MessageContent
		name?: string | undefined
	}[]
	functions?: any[] | undefined
	function_call?: any | undefined
	stream?: boolean | undefined
	temperature?: number | undefined
	top_p?: number | undefined
	max_tokens?: number | undefined
	n?: number | undefined
	best_of?: number | undefined
	frequency_penalty?: number | undefined
	presence_penalty?: number | undefined
	logit_bias?:
		| {
				[x: string]: number
		  }
		| undefined
	stop?: (string[] | string) | undefined
}

// API route handler
// eslint-disable-next-line import/no-anonymous-default-export
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Check if it's a POST request
    if (req.method !== 'POST') {
        res.status(405).end(); // Method Not Allowed
        return;
    }

    try {
        // Extract parameters from the request body
        const { image, html, apiKey } = req.body;

        // Call the OpenAI API
        const response = await getHtmlFromOpenAI({ image, html, apiKey });

        // Send back the response
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
