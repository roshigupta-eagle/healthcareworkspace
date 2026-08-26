This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## AI drafting gateway

Doctor-note AI drafting is gateway-only. Configure these server-side environment variables before using it:

```text
ROSHI_AI_DRAFT_URL=https://your-approved-gateway.example/draft
ROSHI_AI_DRAFT_API_KEY=your-server-side-key
ROSHI_AI_DRAFT_TIMEOUT_MS=60000
```

Alternatively, configure a server-side OpenAI-compatible provider:

```text
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
```

For open-weight inference through Hugging Face Inference Providers, use the configured local defaults and add a server-side token:

```text
HUGGINGFACE_INFERENCE_URL=https://router.huggingface.co/v1/chat/completions
HUGGINGFACE_MODEL=google/gemma-2-2b-it
HF_TOKEN=hf_your_fine_grained_inference_token
```

`HUGGINGFACE_API_KEY` is accepted as an alternative token name. Create a fine-grained Hugging Face token with Inference Providers permission; never expose it through `NEXT_PUBLIC_*` variables or client code.

The configured provider receives the clinician's structured drafting settings and only the patient context selected in the assistant. It must return JSON containing a non-empty `draft` string, an OpenAI-compatible `choices[0].message.content` string, or a Hugging Face `generated_text` string. When no provider is configured or the provider is unavailable, the route returns an explicit error and does not generate local substitute prose.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
