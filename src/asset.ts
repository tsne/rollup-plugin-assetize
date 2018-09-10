import * as crypto from "crypto";
import * as path from "path";



export interface Asset {
	readonly path: string;
	readonly name: string;
	readonly url: string;
	readonly refs: ReadonlyArray<Asset>;
	readonly content: Buffer;
}

export interface AssetContent {
	readonly data: Buffer;
	readonly refs: ReadonlyArray<Asset>;
}

export type AssetLoader = (filename: string) => Promise<Asset>;


export function assetName(filename: string, data: Buffer): string {
	const hash = crypto.createHash("sha256");
	hash.update(data);
	return hash.digest("hex").slice(0, 8) + path.extname(filename);
}

export function assetExt(name: string): string {
	return path.extname(name).toLowerCase();
}
