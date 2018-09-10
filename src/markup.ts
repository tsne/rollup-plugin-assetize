import {Node, TagNode} from "@leizm/html-parser";
import {Asset, AssetContent, AssetLoader} from "./asset";
import {isAbsoluteURL} from "./url";

const htmlParser = require("@leizm/html-parser");



export function loadHTML(data: Buffer, loadAsset: AssetLoader, minify: boolean): Promise<AssetContent> {
	let {nodes, errors} = htmlParser.parse(data.toString("utf8"));
	if(errors && errors.length) {
		return Promise.reject(errors.map(err => err.message));
	}

	const refLoads: Array<Promise<Asset>> = [];

	const loadPropertyRef = (node: TagNode, propName: string): void => {
		if(!node.properties) {
			return;
		}

		const url = node.properties[propName];
		if(url && typeof url === "string" && !isAbsoluteURL(url)) {
			refLoads.push(loadAsset(url).then(asset => {
				if(asset) {
					node.properties[propName] = asset.url;
				}
				return asset;
			}));
		}
	};

	const loadRefs = (node: Node): void => {
		if(!isTagNode(node)) {
			return;
		}

		switch(node.name) {
		case "link":
		case "a":
			loadPropertyRef(node, "href");
			break;

		case "script":
		case "img":
		case "input":
			loadPropertyRef(node, "src");
			break;
		}

		if(node.children) {
			node.children.forEach(loadRefs);
		}
	};

	if(minify) {
		nodes = htmlParser.minifyNodes(nodes, {keepEmptyTextNode: true})
	}
	nodes.forEach(loadRefs);
	return Promise.all(refLoads).then(refs => {
		return {
			data: Buffer.from(htmlParser.toString(nodes)),
			refs,
		};
	});
}


function isTagNode(n: Node): n is TagNode {
	return n.type === "tag";
}
