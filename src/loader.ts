import * as fs from "fs";
import * as path from "path";
import {Asset, AssetContent, AssetLoader, assetName, assetExt} from "./asset";
import {loadCSS} from "./style";
import {loadHTML} from "./markup";



export interface LoaderOptions {
	minify: boolean;
	assetRoot: string;
	customUrl: (filename: string) => string;
}

type ContentLoader = (data: Buffer, loadAsset: AssetLoader, minify?: boolean) => Promise<AssetContent>;


const contentLoaders: {[ext: string]: ContentLoader} = {
	".htm": loadHTML,
	".html": loadHTML,
	".css": loadCSS,
	".bmp": loadRaw,
	".gif": loadRaw,
	".ico": loadRaw,
	".jpg": loadRaw,
	".jpeg": loadRaw,
	".png": loadRaw,
	".svg": loadRaw,
	".tif": loadRaw,
	".webp": loadRaw,
	".ttf": loadRaw,
	".woff": loadRaw,
	".woff2": loadRaw,
};


export function canLoad(name): boolean {
	return assetExt(name) in contentLoaders;
}

export function assetLoader(opts: LoaderOptions): AssetLoader {
	const assets = new Map<string, Asset>(); // filename => asset
	const loading = new Set<string>();

	const newAsset = (filename: string, content: AssetContent): Asset => {
		const name = assetName(filename, content.data);
		return {
			path: filename,
			name,
			url: opts.customUrl(filename) || path.join("/", opts.assetRoot, name),
			refs: content.refs.filter(ref => ref != null),
			content: content.data,
		};
	};

	return function loadAsset(filename: string): Promise<Asset> {
		const asset = assets.get(filename);
		if(asset) {
			return Promise.resolve(asset);
		}

		const ext = assetExt(filename);
		const loadContent = contentLoaders[ext];
		if(!loadContent) {
			return Promise.resolve(null);
		}

		if(loading.has(filename)) {
			return Promise.reject(`asset ${filename} already loading. cyclic dependencies?`);
		}
		loading.add(filename);

		const dir = path.dirname(filename);
		const loader = (fname: string): Promise<Asset> => {
			return loadAsset(path.join(dir, fname));
		};

		return readFile(filename).then(data => {
			return loadContent(data, loader, opts.minify);
		}).then(content => {
			const asset = newAsset(filename, content);
			loading.delete(filename);
			assets.set(filename, asset);
			return asset;
		});
	};
}


function loadRaw(data: Buffer, loadAsset: AssetLoader): Promise<AssetContent> {
	return Promise.resolve({
		data,
		refs: [],
	});
}

function readFile(filename: string): Promise<Buffer> {
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
