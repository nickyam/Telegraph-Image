// Bing daily wallpapers for the homepage backdrop.
//
// Two things matter here:
// 1. Cache the JSON at the edge. Without it every homepage view woke a Function
//    (cold start included) and called cn.bing.com again — pure waste for data
//    that only changes once a day.
// 2. Never cache a failure. A Bing hiccup used to be indistinguishable from a
//    real answer, so a 5xx must go out as no-store, otherwise the empty list
//    sticks on that POP for the whole TTL.
const CACHE_TTL = 21600; // 6h: the image list rotates daily

export async function onRequest(context) {
    const { request } = context;

    const body = await fetchBingImages();
    if (!body) {
        return new Response(JSON.stringify({
            status: false,
            message: '壁纸接口暂时不可用',
            data: [],
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Cache-Control': 'no-store',
            },
        });
    }

    const headers = {
        'Content-Type': 'application/json;charset=UTF-8',
    };

    // Only cache real GETs: a HEAD should not populate the shared cache entry.
    if (request.method === 'GET' && !request.headers.get('Authorization')) {
        headers['Cache-Control'] = `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`;
    } else {
        headers['Cache-Control'] = 'no-store';
    }

    return new Response(JSON.stringify(body), { headers });
}

async function fetchBingImages() {
    try {
        const res = await fetch('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5', {
            // Without a timeout a slow/unreachable Bing hangs the Function until
            // the platform limit kills it, and the homepage waits the whole time.
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': 'curl/8.4.0', Accept: '*/*' },
        });
        if (!res.ok) return null;

        const data = await res.json();
        const images = Array.isArray(data && data.images) ? data.images : [];
        if (!images.length) return null;

        return { status: true, message: '操作成功', data: images };
    } catch (error) {
        console.error('Bing wallpaper fetch failed: ' + error.message);
        return null;
    }
}
