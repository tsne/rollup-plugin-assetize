import * as path from "path";
import {Node, TagNode} from "@leizm/html-parser";
import {Asset, AssetLoader, assetName} from "./asset";
import {readFile, isAbsoluteURL} from "./util";

const htmlParser = require("@leizm/html-parser");



export function loadHTML(filename: string, loadAsset: AssetLoader, minify: boolean): Promise<Asset> {
	return readFile(filename).then(data => {
		let {nodes, errors} = htmlParser.parse(data.toString("utf8"));
		if(errors && errors.length) {
			throw errors.map(err => err.message);
		}

		const dir = path.dirname(filename);
		const refLoads: Array<Promise<Asset>> = [];

		const loadPropertyRef = (node: TagNode, propName: string) => {
			if(!node.properties) {
				return;
			}

			const val = node.properties[propName];
			if(val && typeof val === "string" && !isAbsoluteURL(val)) {
				const refname = path.join(dir, val);
				refLoads.push(loadAsset(refname).then(asset => {
					if(asset) {
						node.properties[propName] = asset.name;
					}
					return asset;
				}));
			}
		};

		const loadRefs = (node: Node) => {
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
			const content = Buffer.from(htmlParser.toString(nodes));
			return {
				name: assetName(filename, content),
				refs: refs.filter(ref => ref != null),
				content,
			};
		});
	});
}


function isTagNode(n: Node): n is TagNode {
	return n.type === "tag";
}
