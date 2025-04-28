# Le Portfolio!

Available at [https://wshbd.com](https://wshbd.com)

## Technical Details
- Build via `node builder.js` from `./scripts/node/`
- Image compressor into .webp format available [here](https://github.com/woshibide/bookmaking/blob/main/image_compressor.py)
- Static site with dynamic content loading from JSON
- Optimized image loading and caching
- HTTPS enabled with proper compression

## Development Journal

Below is my ongoing development journal tracking the progress of features and tasks:

===

[x] - on hover over elements long description
[x] - 404
[x] - portfolio itself
    [x] - home
    [x] - sections
        [ ] - p5js sketches to be added
        [x] - carrousel for expanded preview
        [x] - filter on click
    [x] - list/archive
    [x] - clear button for filters
[x] - press kit
[x] - footer
[x] - random.html page
[x] - ultra attention to colors of white and black
[x] - clickable footer
[x] - if non image is used it can be stretched to fit
[x] - blinking for reset hashtag button 
[x] - web essays 
[x] - index add swipe for gallery
[x] - archive indicate link when hover over id
[x] - loading spinner while archive image is being fetched

[x] - mock ups
[x] - project texts
[x] - preview for sharing
[x] - favicons
[x] - 404 canvas first text after
[x] - something upon click to index to open full project page
[x] - error pages
[x] - archive footer bug

[ ] - redirect from admin.wshbd.com to rick roll
[x] - shared js functions into separate file
[x] - json to pass info into different sections
[x] - js to populate info from given json
[x] - json image mapper
[x] - highlight to archive dependency move
[x] - shared, simple carousel
[x] - images in archive
[x] - cache json
[x] - cache images

[ ] - email
[ ] - ipv6
[x] - GitLab CI/CD
[x] - https
[x] - deprecate password and use ssh only
[x] - new server (debian or alpine)
[x] - Gzip/Brotli Compression

[x] - lighttheme state
[x] - hashtag search
[x] - clock

[x] - custom page loader

[x] - projects add alike projects section
[ ] - index post works a something or a something section?
[ ] - archive add boolean to declare if project is to be used in the website
[ ] - tolstoi images to normalize
[x] - archive in mobile to normalize layout
[ ] - animations
[x] - personal website it should be
[x] - certifi should work
[x] - no underline
[x] - reworked nav
[x] - when in something, instead of something else button, when clicked till the end to show new project
    [x] - on scroll down / up new project
[x] - swipe for something page on mobile
[x] - featured preload of the next image
[ ] - user experience when link accessed from side panel to first hide it 
[ ] - loader either give up or implement normally
[x] - image index for random
[ ] - rename something to theatre
 
[ ] - purge option on the nginx
[ ] - progressive image load, a script that generates 5 or so images that are swapped at load
[ ] - image swapping in general once loaded
[ ] - htx file?




## caching
shared cache?! private cache?!


### FE
- service workers is like fine tuning the caching method

#### implementation 
- upon first load jsons to be fetched and cached
- when visiting other pages fetched images to be stored

```
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    
    if (requestUrl.pathname.startsWith('/content/images/')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request).then((networkResponse) => {
                    return caches.open('project-images').then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    } else {
        event.respondWith(fetch(event.request));
    }
});
```


### BE
- headers give instructions to browsers how to deal with files
- - etag // when last time modified if ? modified : get new version
- - expires // for how long cache to be in the browser
- - cache control // 

- cache everything! for long! on nginx!
```location /content/images/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000";
}```





