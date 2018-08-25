import * as path from "path";
import {Asset, AssetLoader, assetName} from "./asset";
import {loadCSS} from "./style";
import {loadHTML} from "./markup";
import {readFile} from "./util";



export interface LoaderOptions {
	minify: boolean;
}

type LoaderFunc = (filename: string, loadAsset: AssetLoader, minify?: boolean) => Promise<Asset>;


const loaders: {[ext: string]: LoaderFunc} = {
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


export function canLoad(name) {
	return assetExt(name) in loaders;
}

export function assetLoader(opts: LoaderOptions): AssetLoader {
	const assets = new Map<string, Asset>(); // filename => asset
	const loading = new Set<string>();

	return function loadAsset(filename: string): Promise<Asset> {
		const asset = assets.get(filename);
		if(asset) {
			return Promise.resolve(asset);
		}

		const ext = assetExt(filename);
		const load = loaders[ext];
		if(!load) {
			return Promise.resolve(null);
		}

		if(loading.has(filename)) {
			return Promise.reject(`asset ${filename} already loading. cyclic dependencies?`);
		}
		loading.add(filename);

		return load(filename, loadAsset, opts.minify).then(asset => {
			loading.delete(filename);
			assets.set(filename, asset);
			return asset;
		});
	};
}


function loadRaw(filename: string, loadAsset: AssetLoader): Promise<Asset> {
	return readFile(filename).then(data => ({
		name: assetName(filename, data),
		refs: [],
		content: data,
	}));
}

function assetExt(name: string): string {
	return path.extname(name).toLowerCase();
}
