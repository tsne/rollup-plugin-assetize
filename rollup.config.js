const pkg = require('./package.json');


export default {
	input: "src/index.ts",
	output: [
		{file: pkg["module"], format: "esm", sourcemap: true},
		{file: pkg["main"], format: "cjs", sourcemap: true},
	],
	external: [
		"crypto",
		"fs",
		"path",
		"process",
	],
	plugins: [
		require("rollup-plugin-tsc")({
			compilerOptions: {
				noUnusedLocals: true,
			},
		}),
	],
};
