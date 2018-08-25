import * as crypto from "crypto";
import * as path from "path";



export interface Asset {
	readonly name: string;
	readonly refs: ReadonlyArray<Asset>;
	readonly content: Buffer;
}

export type AssetLoader = (filename: string) => Promise<Asset>;


export function assetName(filename: string, data: Buffer): string {
	const hash = crypto.createHash("sha256");
	hash.update(data);
	return hash.digest("hex").slice(0, 7) + path.extname(filename);
}
