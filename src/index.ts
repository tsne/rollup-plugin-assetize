import * as path from "path";
import {Plugin, OutputOptions, OutputBundle, RawSourceMap} from "rollup";
import {Asset} from "./asset";
import {assetLoader, canLoad} from "./loader";
import {writeFile} from "./util";


export interface PluginOptions {
	output?: {
		dir?: string;
		minify?: boolean;
	};
	root?: string;
}


export default function assetize(config?: PluginOptions): Plugin {
	config = config || {};
	config.output = config.output || {};
	config.output.dir = config.output.dir || "assets";
	config.root = config.root || "/assets";

	const idPrefix = "\0asset:";
	const loadAsset = assetLoader({minify: !!config.output.minify});
	const assets = new Map<string, Asset>(); // asset name => asset

	const addAsset = (asset: Asset): void => {
		assets.set(asset.name, asset);
		asset.refs.forEach(addAsset);
	};

	return {
		name: "assetize",

		resolveId(id: string, parent: string): string|null {
			if(canLoad(id)) {
				return idPrefix + id;
			}
			return null;
		},

		load(id: string): Promise<string>|null {
			if(!id.startsWith(idPrefix)) {
				return null;
			}

			const filename = id.slice(idPrefix.length);
			return loadAsset(filename).then(asset => {
				if(asset == null) {
					throw `not an asset: ${filename}`;
				}
				addAsset(asset);

				const url = path.join("/", config.root, asset.name);
				return `export default "${url}";`;
			});
		},

		generateBundle(opts: OutputOptions, bundle: OutputBundle, isWrite: boolean): Promise<void> {
			if(!isWrite) {
				return;
			}

			const writes: Array<Promise<void>> = [];
			assets.forEach(asset => {
				const filename = path.join(config.output.dir, asset.name);
				writes.push(writeFile(filename, asset.content));
			});
			return Promise.all(writes).then(() => {});
		},

		transformChunk(code: string, opts: OutputOptions): Promise<{code: string; map: RawSourceMap}>|null {
			if(!config.output.minify) {
				return null;
			}

			return new Promise<{code: string; map: RawSourceMap}>((resolve, reject) => {
				const res = require("terser").minify(code, {
					sourceMap: !!opts.sourcemap,
				});
				if(res.error) {
					return reject(res.error.message);
				}

				resolve({
					code: res.code,
					map: res.map || {mappings: ""},
				});
			});
		},
	};
}
