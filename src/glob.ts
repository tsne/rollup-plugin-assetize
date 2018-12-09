import * as fs from "fs";
import * as path from "path";



export default function glob(patterns: ReadonlyArray<string>): Array<string> {
	const root = dir(process.cwd(), "");
	const matchers = patterns.map(p => parsePattern(p.replace("\\", "/").split("/"), 0));
	return sort(unique(flatten(matchers.map(m => m(root)))));
}


interface Directory {
	readonly name: string;
	readonly path: string;
	readonly info: DirInfo;
}

interface DirInfo {
	readonly subdirs: ReadonlyArray<Directory>;
	readonly files: ReadonlyArray<string>;
}

type Matcher = (root: Directory) => Array<string>;


function dir(name: string, parentPath: string): Directory {
	const dirpath = path.join(parentPath, name);
	const subdirs = [];
	const files = [];
	fs.readdirSync(dirpath).forEach(filename => {
		const stat = fs.statSync(path.join(dirpath, filename));
		if(!filename.startsWith(".")) {
			if(stat.isDirectory()) {
				subdirs.push(dir(filename, dirpath));
			} else {
				files.push(filename);
			}
		}
	});

	return {
		name,
		path: dirpath,
		info: {subdirs, files},
	};
}

function parsePattern(components: Array<string>, idx: number): Matcher {
	if(idx === components.length) {
		return matchNothing;
	}

	const isLast = idx === components.length - 1;
	const matchNext = parsePattern(components, idx + 1);
	switch(components[idx]) {
	case "":
		return matchNothing;

	case "*":
		if(isLast) {
			return (root: Directory): Array<string> => {
				return root.info.files.map(fullpath(root));
			};
		} else {
			return (root: Directory): Array<string> => {
				return flatten(root.info.subdirs.map(matchNext));
			};
		}

	case "**":
		if(isLast) {
			return matchNothing; // we want to match files only
		} else {
			return function matchAsterisks(root: Directory): Array<string> {
				return unique(flatten(root.info.subdirs.map(matchAsterisks).concat(root.info.subdirs.map(matchNext))));
			};
		}

	default:
		const rx = toRegexp(components[idx]);
		if(isLast) {
			return (root: Directory): Array<string> => {
				return root.info.files.filter(f => rx.test(f)).map(fullpath(root));
			};
		} else {
			return (root: Directory): Array<string> => {
				return flatten(root.info.subdirs.filter(dir => rx.test(dir.name)).map(matchNext));
			};
		}
	}
}


function toRegexp(s: string): RegExp {
	let rx = "";
	for(let i = 0; i < s.length; ++i) {
		switch(s[i]) {
		case "*":
			if(i+1 < s.length && s[i+1] === "*") {
				throw new Error("invalid glob token '**'");
			}
			rx += ".*";
			break;

		case "?":
			rx += ".";
			break;

		case "[":
			rx += "[";
			if(++i < s.length) {
				rx += s[i] === "!" ? "^" : s[i];
				for(++i; i < s.length && s[i] != "]"; ++i) {
					rx += s[i];
				}
				rx += i === s.length ? "" : "[";
			}
			break;

		case ".":
			rx += "\\.";
			break;

		default:
			rx += s[i];
			break;
		}
	}

	return new RegExp(`^${rx}$`);
}

function matchNothing(root: Directory): Array<string> {
	return [];
}

function flatten(arrs: Array<Array<string>>): Array<string> {
	return arrs.reduce((res, arr) => {
		res.push(...arr);
		return res;
	}, []);
}

function unique(arr: Array<string>): Array<string> {
	const found = {};
	return arr.filter(e => {
		const pass = !(e in found);
		found[e] = true;
		return pass;
	});
}

function sort(arr: Array<string>): Array<string> {
	arr.sort((x, y) => x.localeCompare(y));
	return arr;
}

function fullpath(dir: Directory) {
	return (filename: string): string => {
		return path.join(dir.path, filename);
	};
}
