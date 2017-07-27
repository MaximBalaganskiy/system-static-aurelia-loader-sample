var gulp = require("gulp");
var Builder = require("systemjs-builder");
var revPath = require("rev-path");
var revHash = require("rev-hash");
var fs = require("fs");
var htmlReplace = require("gulp-html-replace");
var del = require("del");
var ts = require("gulp-typescript");
var plumber = require("gulp-plumber");
var merge = require("merge2");
var runSequence = require("run-sequence");

var root = "./";
var distFolder = "dist/";
var distPath = root + distFolder;
var builder = new Builder(root, root + "jspm.config.js");

var bundle = [
	"aurelia-bootstrapper",
	"aurelia-pal-browser",
	"aurelia-loader",
	"aurelia-framework",
	"aurelia-logging-console",
	"aurelia-templating-binding",
	"aurelia-templating-resources",
	"aurelia-event-aggregator",
	"aurelia-history-browser",
	"aurelia-templating-router",
	"aurelia-polyfills",
	"aurelia-templating",
	"aurelia-logging",
	"aurelia-pal",
	"fetch",
	"system-static-aurelia-loader",
	"materialize",
	"aurelia-materialize-bridge",
	"aurelia-materialize-bridge/**/*.html!text",
	"aurelia-materialize-bridge/**/*.js",
	"aurelia-materialize-bridge/**/*.css!text",
	"src/**/*.js",
	"src/**/*.html!text",
	"src/**/*.css!text"
];

function getOutFileName(source, fileName) {
	return revPath(fileName, revHash(new Buffer(source, "utf-8")));
}

gulp.task("del", function () {
	return del([distPath + "build*.js", paths.root + "**/*.js"]);
});

var tsProjectCJS = ts.createProject("./tsconfig.json", {
	typescript: require("typescript"),
	"declaration": true,
	target: "es5",
	module: "commonjs"
});

var srcRoot = "src/";

var paths = {
	root: srcRoot,
	source: srcRoot + "**/*.ts",
	output: srcRoot,
	dtsSrc: [
		"./typings/**/*.d.ts",
		"./custom_typings/**/*.d.ts"
	]
};

gulp.task("build-commonjs", ["del"], function () {
	var tsResult = gulp.src(paths.dtsSrc.concat(paths.source))
		.pipe(plumber())
		.pipe(tsProjectCJS());
	return merge([ // Merge the two output streams, so this task is finished when the IO of both operations is done. 
			tsResult.dts.pipe(gulp.dest(paths.output)),
			tsResult.js.pipe(gulp.dest(paths.output))
		])
		.pipe(gulp.dest(paths.output));
});

gulp.task("build", ["build-commonjs"], function () {
	return builder
		.buildStatic(bundle.join(" + "), {
			sourceMaps: false,
			encodeNames: false,
			minify: true
		}) // !!! `encodeNames: false` is very important
		.then(content => {
			var fileName = getOutFileName(content.source, "build.js");
			if (!fs.existsSync(distPath)) {
				fs.mkdir(distPath);
			}
			fs.writeFileSync(distPath + fileName, content.source);
			var map = {};
			var unknown = [];
			for (var module of content.modules) {
				// match a jspm module
				var m = /^(npm|github):([a-zA-Z-\.\/]+)@([a-zA-Z\d\.]+)\/([a-zA-Z-\d\_\.\/]+).(js|css|html)(!.*)?$/.exec(module);
				if (m) {
					if (m[2] === m[4]) {
						map[m[2]] = module;
					} else {
						map[m[2] + "/" + m[4] + (m[5] === "js" ? "" : ("." + m[5]))] = module;
					}
				} else {
					// match application module
					var lm = /^([a-zA-Z-\d\/\s\.]+).(js|html|css|min.css)(!.*)?/.exec(module);
					if (lm) {
						map[lm[1] + (lm[2] === "js" ? "" : ("." + lm[2]))] = module;
					} else {
						unknown.push(module);
					}
				}
			}
			// fix some exceptions
			map["aurelia-materialize-bridge"] = map["aurelia-materialize-bridge/index"];
			if (unknown.length) {
				throw new Error("Could not create mapping for " + JSON.stringify(unknown));
			}
			var mappings = "var $__SystemMapping = " + JSON.stringify(map);
			var mappingFileName = getOutFileName(mappings, "build.mapping.js");
			fs.writeFileSync(distPath + mappingFileName, mappings);
			return gulp
				.src(root + "index.html")
				.pipe(htmlReplace({
					js: [distFolder + mappingFileName, distFolder + fileName]
				}, {
					keepBlockTags: true,
					keepUnassigned: true
				}))
				.pipe(gulp.dest(root));
		});
});

gulp.task("unbundle", function () {
	return gulp
		.src(root + "index.html")
		.pipe(htmlReplace({
			js: ["jspm_packages/system.js", "jspm.config.js", "<script>System.import('aurelia-bootstrapper');</script>"],
		}, { keepBlockTags: true, keepUnassigned: true }))
		.pipe(gulp.dest(root));
});