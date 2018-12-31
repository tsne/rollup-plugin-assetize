import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import * as rollup from "rollup";
import {Asset} from "./asset";
import {assetLoader, canLoad} from "./loader";
import glob from "./glob";



export interface PluginConfig {
	input?: ReadonlyArray<string>;
	output?: {
		dir?: string;
		minify?: boolean;
		paths?: {[sourcePath: string]: string};
	};
	web?: {
		root?: string;
		paths?: {[sourcePath: string]: string};
	};
}


export default function assetize(config?: PluginConfig): rollup.Plugin {
	config = config || {};
	config.input = config.input || [];
	config.output = config.output || {};
	config.output.dir = config.output.dir || "assets";
	config.output.minify = !!config.output.minify;
	config.output.paths = config.output.paths || {};
	config.web = config.web || {};
	config.web.root = config.web.root || "/assets";
	config.web.paths = config.web.paths || {};

	const idPrefix = "\0asset:";
	const assets = new Map<string, Asset>(); // filename => asset
	const loadAsset = assetLoader({
		minify: config.output.minify,
		assetRoot: config.web.root,
		customUrl: customPaths(config.web.paths),
	});

	const registerAsset = (asset: Asset): void => {
		assets.set(asset.name, asset);
		asset.refs.forEach(registerAsset);
	};

	const addAsset = (filename: string): Promise<Asset> => {
		return loadAsset(filename).then(asset => {
			if(asset == null) {
				throw `not an asset: ${filename}`;
			}
			registerAsset(asset);
			return asset;
		});
	};

	return {
		name: "assetize",

		buildStart(options: rollup.InputOptions): Promise<void>|void {
			if(!config.input) {
				return;
			}

			const filenames = glob(config.input);
			return Promise.all(filenames.map(addAsset)).then(() => {});
		},

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
			return addAsset(filename).then(asset => `export default "${asset.url}";`);
		},

		renderChunk(code: string, chunk: rollup.RenderedChunk, opts: rollup.OutputOptions): Promise<{code: string; map: rollup.RawSourceMap}>|null {
			if(!config.output.minify) {
				return null;
			}

			return new Promise<{code: string; map: rollup.RawSourceMap}>((resolve, reject) => {
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

		generateBundle(opts: rollup.OutputOptions, bundle: rollup.OutputBundle, isWrite: boolean): Promise<void> {
			if(!isWrite) {
				return;
			}

			const outputPath = customPaths(config.output.paths);
			const writes: Array<Promise<void>> = [];
			assets.forEach(asset => {
				const filename = outputPath(asset.path) || path.join(config.output.dir, asset.name);
				writes.push(writeFile(filename, asset.content));
			});
			return Promise.all(writes).then(() => {});
		},
	};
}


function customPaths(custom: {[path: string]: string}): (filename: string) => string {
	const cwd = process.cwd();
	return (filename: string): string => {
		if(filename in custom) {
			return custom[filename];
		}

		const rel = path.relative(cwd, filename);
		if(rel in custom) {
			return custom[rel];
		}

		return "";
	};
}

function writeFile(filename: string, data: Buffer): Promise<void> {
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
