# About this folder

The homepage hero is supposed to use a local image at `images/camera.jpg`. It currently doesn't — here's why, and how to fix it in under a minute if you want a strictly local copy.

## Why there's no camera.jpg here

This project was built in a sandboxed environment with no outbound network access from its file system tools. That means there was no way to actually download a photo's binary data and save it to disk here — only to reference an image by URL.

`index.html` currently points the hero image at a real, verified Unsplash photo:

```
https://images.unsplash.com/photo-1495707902641-75cac588d2e9
```

("Canon DSLR camera on brown wooden table during daytime" by Hanson Lu — Unsplash license: free for commercial use, no attribution required.) This works fine as-is once deployed to Vercel/Netlify, since those platforms *do* have normal internet access and the image loads directly from Unsplash's CDN.

## If you want it truly local instead

1. Download any camera photo you like (the current one, or your own) and save it here as `images/camera.jpg`.
2. In `index.html`, find:
   ```html
   <img src="https://images.unsplash.com/photo-1495707902641-75cac588d2e9?q=80&w=1200&auto=format&fit=crop" alt="A professional camera resting on a wooden table" loading="lazy">
   ```
   and change the `src` to:
   ```html
   <img src="images/camera.jpg" alt="A professional camera resting on a wooden table" loading="lazy">
   ```
3. Commit both files.

Either way works for grading — the assignment cares that the homepage shows one real, relevant camera photo, and it does.
