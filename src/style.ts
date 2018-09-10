import {Asset, AssetContent, AssetLoader} from "./asset";
import {isAbsoluteURL} from "./url";


const csstree = require("css-tree");
const csso = require("csso");



export function loadCSS(data: Buffer, loadAsset: AssetLoader, minify: boolean): Promise<AssetContent> {
	const errors = [];
	const ast = csstree.parse(data.toString("utf8"), {
		positions: true,
		onParseError: errors.push,
	});
	if(errors.length) {
		return Promise.reject(errors);
	}

	const refLoads: Array<Promise<Asset>> = [];

	const loadRef = (node: any, key: string) => {
		const url = node[key];
		if(typeof url === "string" && !isAbsoluteURL(url)) {
			refLoads.push(loadAsset(url).then(asset => {
				if(asset) {
					node[key] = asset.url;
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
		if(minify) {
			data = Buffer.from(csso.compress(ast));
		}
		return {data, refs};
	});
}
