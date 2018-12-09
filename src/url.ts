const schemeRx = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;


export function isAbsoluteURL(url: string): boolean {
	return url.startsWith("/") || schemeRx.test(url);
}
