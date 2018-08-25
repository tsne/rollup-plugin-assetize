# rollup-plugin-assetize

A small [Rollup](https://github.com/rollup/rollup) plugin for handling assets (markup, stylesheets, images, and fonts).

All assets can be imported from the code as usual. The plugin collects the imported assets and writes them to the configured output directory. For each asset also the referenced assets (e.g. linked stylesheets im HTML) are collected if they have a known extension and are referenced with a relative path.

## Installation
```
npm install --save-dev rollup-plugin-assetize
```

## Usage
```js
// rollup.config.js
import assetize from "rollup-plugin-assetize";

export default {
	input: "src/main.js",

	plugins: [
		assetize({
			output: {
				dir: "assets", // directory where the assets should be emitted
				minify: false, // minify the assets?
			},
			root: "/assets",   // root path of asset urls
		}),
	]
};
```
