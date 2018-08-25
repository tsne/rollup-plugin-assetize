import * as path from "path";
import {Asset, AssetLoader, assetName} from "./asset";
import {readFile, isAbsoluteURL} from "./util";


const csstree = require("css-tree");
const csso = require("csso");



export function loadCSS(filename: string, loadAsset: AssetLoader, minify: boolean): Promise<Asset> {
	return readFile(filename).then(data => {
		const errors = [];
		const ast = csstree.parse(data.toString("utf8"), {
			positions: true,
			onParseError: errors.push,
			filename,
		});
		if(errors.length) {
			throw errors;
		}

		const dir = path.dirname(filename);
		const refLoads: Array<Promise<Asset>> = [];

		const loadRef = (node: any, key: string) => {
			const url = node[key];
			if(typeof url === "string" && !isAbsoluteURL(url)) {
				const refname = path.join(dir, url);
				refLoads.push(loadAsset(refname).then(asset => {
					if(asset) {
						node[key] = asset.name;
					}
					return asset;
				}));
			}
		}

		const loadRefs = (node: any) => {
			if(node.type === "Url") {
				loadRef(node, "value");
			}
			if(node.children) {
				node.children.forEach(loadRefs);
			}
		};

		loadRefs(ast);
		return Promise.all(refLoads).then(refs => {
			let content = ast;
			if(minify) {
				content = Buffer.from(csso.compress(content));
			}
			return {
				name: assetName(filename, content),
				refs: refs.filter(ref => ref != null),
				content,
			};
		});
	});
}
