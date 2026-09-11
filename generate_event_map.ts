
// run "deno task generate" to generate

import ts from "typescript";
import { dirname, fromFileUrl, join } from "@std/path";


const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const CACHE_PATH = join(SCRIPT_DIR, "lib.dom.d.ts");

async function loadLibDom(): Promise<string> {
	try {
		const cached = await Deno.readTextFile(CACHE_PATH);
		console.error(`Cache hitted: ${CACHE_PATH}(${(cached.length / 1024 / 1024).toFixed(2)}MB)`);
		return cached;
	} catch (e) {
		if (!(e instanceof Deno.errors.NotFound)) {
			console.error("Read file failed: ", e);
		}
	}

	const source = await loadLibDomFromSources();
	try {
		await Deno.writeTextFile(CACHE_PATH, source);
		console.error(`Cached: ${CACHE_PATH}`);
	} catch (e) {
		console.error("Cached Failed: ", e);
	}
	return source;
}

async function loadLibDomFromSources(): Promise<string> {
	const defaultLibPath = ts.getDefaultLibFilePath({
		target: ts.ScriptTarget.ESNext,
	});
	const libDir = defaultLibPath.slice(0, defaultLibPath.lastIndexOf("/"));
	return await Deno.readTextFile(`${libDir}/lib.dom.d.ts`);
}


async function main() {
	console.error("Loading lib.dom.d.ts ...");
	const source = await loadLibDom();

	console.error("Analyzing ...");
	const sourceFile = ts.createSourceFile(
		"lib.dom.d.ts",
		source,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ true,
	);

	const interfaces: { name: string, type_str: string, constraint: string }[] = [];
	ts.forEachChild(sourceFile, function visit(node) {
		if (ts.isInterfaceDeclaration(node)) {
			const interface_name = node.name.text;
			const type_str = node.typeParameters && node.typeParameters.length > 0
				? `<${node.typeParameters?.map((parameter) => parameter.getText()).join(",")}>`
				: "";

			for (const m of node.members) {
				if (ts.isMethodSignature(m) && m.name.getText() === "addEventListener") {
					const constraint = m.typeParameters?.[0].constraint;
					if (constraint && ts.isTypeOperatorNode(constraint)) {
						if (constraint.operator === ts.SyntaxKind.KeyOfKeyword) {
							interfaces.push({
								name: interface_name,
								type_str,
								constraint: constraint.type.getText()
							})
						}
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	});

	const lines: string[] = [];

	// generate interfaces
	for (const { name, constraint, type_str } of interfaces) {
		lines.push(`\tinterface ${name}${type_str} { readonly [__EventMapBrand]: ${constraint} }`)
	}

	let head_fragment = await Deno.readTextFile("./head.ts_fragment");
	const footer_fragment = await Deno.readTextFile("./footer.ts_fragment");

	const info: Record<string, string> = {
		version: ts.version,
		source: `https://github.com/zkip/LibDOMEventMapTypeGenerator`,
	}

	head_fragment = head_fragment.replaceAll(/\{([a-zA-Z_][a-zA-Z_0-9]*)\}/g, (_, pattern_id) => info[pattern_id]);

	try {
		await Deno.remove(`./out/${info.version}/event_map.d.ts`)
	} catch (error) {
		if (!(error instanceof Deno.errors.NotFound)) {
			throw error;
		}
	}
	const output = [head_fragment, ...lines, footer_fragment].join("\n");
	await Deno.mkdir(`./out/${info.version}`, { recursive: true });
	await Deno.writeTextFile(`./out/${info.version}/event_map.d.ts`, output);
	console.log(`Interfaces found: ${interfaces.length}`);
	console.log("Generate complete");
}

await main();