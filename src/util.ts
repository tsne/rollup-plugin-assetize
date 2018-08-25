import * as fs from "fs";



const schemeRx = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;


export function isAbsoluteURL(url: string): boolean {
	return url.startsWith("/") || schemeRx.test(url);
}

export function readFile(filename: string): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		fs.readFile(filename, (err, data) => {
			if(err) {
				reject(err);
			} else {
				resolve(data);
			}
		})
	});
}

export function writeFile(filename: string, data: Buffer): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.writeFile(filename, data, err => {
			if(err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}
