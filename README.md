# MY LITTLE JOURNEY — Vinka Sri Aulia Rinata

Static personal portfolio built with HTML, CSS, JavaScript and Pages CMS. Hosting target: Cloudflare Pages.

## 1. Local preview

Requirements: Node.js 18+.

```bash
npm run build
npx serve dist
```

Open the local URL printed by `serve`. The build has no production dependencies and creates `dist/`.

## 2. GitHub

1. Create a new GitHub repository named `my-little-journey`.
2. Extract this ZIP and upload the **contents** of this folder to the repository root (not the enclosing folder).
3. Commit to the `main` branch.

## 3. Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.
2. Choose the GitHub repository.
3. Framework preset: None.
4. Build command: `npm run build`.
5. Build output directory: `dist`.
6. Root directory: `/` (default).
7. Save and deploy. Each push to `main` triggers a deployment.

## 4. Pages CMS

1. Visit https://app.pagescms.org and sign in with the GitHub account that owns the repository.
2. Install/authorize the Pages CMS GitHub App for this repository.
3. Open the repository and select the `main` branch. Pages CMS reads `.pages.yml` at the repository root.
4. Use **Videos** to create/edit/delete video entries and **Jurnal articles** to manage journal entries. Set `status` to `draft` while preparing and `published` to show it publicly.
5. Upload cover images with the CMS image picker. Images are committed under `media/images/`.
6. CMS edits are Git commits. Cloudflare then rebuilds and publishes them automatically.

**Important:** CMS access is controlled by GitHub authorization. Only authorize trusted accounts. Do not put passwords, API keys, or private data in content files.

## 5. Content rules

- Video: paste a normal YouTube URL such as `https://www.youtube.com/watch?v=VIDEO_ID`. A watch page is generated at `/watch.html?slug=your-slug` and embeds the video using YouTube's privacy-enhanced host.
- Journal: enter a unique lowercase `slug` using hyphens, for example `my-first-trip`. Article detail is shareable at `/article.html?slug=my-first-trip`.
- For new entries, the slug should match the JSON filename (without `.json`). If Pages CMS creates a different filename, rename the entry file to `<slug>.json` in GitHub.
- Dates use `YYYY-MM-DD`. Latest published content appears first.
- Drafts are excluded from public listings and detail pages.

## 6. Replace personal photos

Replace the placeholder images in `media/images/` while keeping the same filenames:

| File | Replace with |
|---|---|
| `hero-placeholder.svg` | Main hero portrait |
| `about.svg` | About Me photo |
| `travel.svg` | Travel portfolio photo |
| `modeling.svg` | Modeling photo |
| `bridal.svg` | Bridal makeup documentation |
| `video-placeholder.svg` | Default video thumbnail |
| `journal-placeholder.svg` | Default journal cover |

Recommended: optimized JPG/WebP, landscape for cards, portrait for hero. You may also upload through Pages CMS and set the relevant `cover` field. Do not use images you do not have permission to publish.

## 7. Custom domain `www.vinkasar.my.id`

1. First deploy the site and confirm its `*.pages.dev` URL works.
2. In Cloudflare Pages → your project → Custom domains → Set up a custom domain, enter `www.vinkasar.my.id` and follow the validation flow.
3. Cloudflare will show the DNS record it needs. At IDWebhost, open DNS management and **inspect existing records before changing anything**.
4. Add/adjust only the record Cloudflare explicitly requests for `www` (commonly a CNAME to `<project>.pages.dev`). Do not delete MX, TXT, or unrelated A/CNAME records. If a conflicting `www` record exists, record its current value before replacing it.
5. If Cloudflare requires the domain zone to be onboarded to Cloudflare, pause and review the impact before changing nameservers. Do not change nameservers as part of this basic Pages setup unless you intentionally decide to migrate DNS and have inventoried all existing records.
6. Wait for DNS validation. Cloudflare provisions HTTPS automatically after the custom domain is active.

The apex `vinkasar.my.id` is not configured in this project; add it separately only if desired and after reviewing existing DNS. Keep the current email-related MX/TXT records intact.

## 8. What is and is not configured

- Public website, video list/player, journal list/detail, responsive navigation and scroll interactions are included.
- CMS is configured to edit repository content through GitHub; it is not a custom password-based `/admin` page. Use the hosted Pages CMS interface.
- YouTube hosts the actual video files. This site only embeds them.
- The initial video and journal entries are drafts; publish real entries from CMS after replacing placeholder copy/media.
- No personal achievements, employment history, contact email, phone number, or unprovided biography has been invented.

## 9. Troubleshooting

- If content is missing after a CMS commit, check the `status` field is `published`, then inspect Cloudflare deployment logs.
- If an image is broken, check its path begins with `/media/images/` and that the file exists in the repository.
- If a YouTube player is blank, confirm the video is public/unlisted and embedding is allowed by its owner.
- If a custom domain is pending, check the exact DNS record shown by Cloudflare and wait for propagation. Do not remove unrelated DNS records.
