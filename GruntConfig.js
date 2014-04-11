var fs = require("fs");

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var requireJsPaths = {
    "jquery":			"./public/lib/jquery-2.0.3.min",
    "jqueryui":			"./public/lib/jquery-ui-1.10.3.custom.min",
    "jqueryAppear":		"./public/lib/jquery.appear",
    "ko":				"./public/lib/knockout-3.0.0",
    "sammy":			"./public/lib/sammy",

    "ajax":				"./public/js/ajaxHandler",
    "apiHandler":		"./public/js/EDMApiPluginHandler",
    "InfoBar":			"./public/js/InfoBar",
    "EDMUtils":			"./public/js/EDMUtils",

    "ckEditor":			"empty:",

    "tinyscrollbar":	"./public/lib/tinyscrollbar-2.0.3/simple/js/jquery.tinyscrollbar",
    "colResizable":		"./public/lib/colResizable-1.3.source",
    "shortcut":			"./public/lib/shortcut",

    "spectrum":			"./public/lib/spectrum-master/spectrum",


    "plupload":			"./public/lib/plupload-1.5.8/js/plupload.full",
    "validator":		"./public/lib/validator.min",
    

    "koKit":					"empty:",
    "koColorPaletteBinding":	"./public/js/koColorPaletteBinding",
    "knockout-sortable":		"./public/lib/knockout-sortable",

    "edmApi":			"empty:",

    "messages":			"./public/js/messages",
    "facebook":			"empty:"
};



module.exports = function edmGruntConfig (grunt, BUILD_TYPES) {
    //-----------------
    //build index files
    //-----------------
    function handlePath(baseDir, templatePath) {
        var path = baseDir;

        if (templatePath) {
            path += "/" + templatePath;
        }

        var stat = fs.statSync(path);
        var retVal = "";

        if(stat.isFile() && path.endsWith(".html")) {
            retVal = "<script type=\"text/html\" id=\"" + path.substring(2, path.length - 5) + "\">" + fs.readFileSync(path, "utf8") + "</script>";
            grunt.log.write(path + " ... ").ok();
        } else if (stat.isDirectory()) {
            fs.readdirSync(path).forEach(function(actPath) {
                retVal += handlePath(path, actPath);
            });
        }
        return retVal;
    }

    function buildFromTemplates (basePath, fileName, destBasePath) {
        grunt.log.write("Building " + fileName + "...\n");
        grunt.log.write(" - src: " + basePath + fileName + "\n");
        grunt.log.write(" - dst: " + destBasePath + fileName + "\n");

        var indexTemplate = fs.readFileSync(basePath + fileName, "utf8");

        process.chdir(basePath + fileName.split("/")[0] + "/templates/");

        var templates = handlePath(".");

        process.chdir("../../..");

        var newContent = indexTemplate.replace("<!--##copy-external-templates-here##-->", templates);
        fs.writeFileSync(destBasePath + fileName, newContent);
        grunt.log.write(destBasePath + fileName).ok();
    }

    function buildIndexFiles() {
        //a fenti fileba kell srcPath, fileName, dest
        for (var prop in BUILD_TYPES) {
            var buildType = BUILD_TYPES[prop];

            buildFromTemplates("./src/", buildType.index, buildType.buildPath);
        }
    }







    //-------
    //copmile
    //-------
    function createCompileConfig(buildType) {
        return {
            options: {
                almond: true,

                baseUrl: "src/",
                name: buildType.compile.name,
                out: buildType.buildPath + buildType.compile.out,
                paths: requireJsPaths,
                removeCombined: true
            }
        };
    }

    function createCompileConfigs() {
        var resObj = {};
        for (var buildTypeName in BUILD_TYPES) {
            var buildType = BUILD_TYPES[buildTypeName];

            resObj[buildTypeName] = createCompileConfig(buildType);
        }
        return resObj;
    }








    //----------
    //copy files
    //----------
    function createFolderCopyConfig(buildType, folderName) {
        return {
            cwd: "src/" + folderName,
            src: ["**"],
            dest: buildType.buildPath + folderName,
            expand: true
        };
    }

    function createFileCopyConfig(buildType, fileName) {
        return {
            src: "src/" + fileName,
            dest: buildType.buildPath + fileName
        };
    }

    function createCopyConfig(buildType) {
        var buildPath = buildType.buildPath,
            idx,
            resArray = [];

        for (idx = 0; idx < buildType.folders.length; idx += 1) {
            resArray.push(createFolderCopyConfig(buildType, buildType.folders[idx]));
        }

        for (idx = 0; idx < buildType.files.length; idx += 1) {
            resArray.push(createFileCopyConfig(buildType, buildType.files[idx]));
        }

        return resArray;
    }

    function createAllCopyConfig() {
        var resObj = {};
        for (var buildTypeName in BUILD_TYPES) {
            resObj[buildTypeName] = {
                files: createCopyConfig(BUILD_TYPES[buildTypeName])
            };
        }
        return resObj;
    }






    //-------------------------
    //create packate.json files
    //-------------------------

    function createPackageJsons() {
        function getPackageJson() {
            return JSON.parse(fs.readFileSync("package.json"));
        }

        function writeProductionPackageJson(destPath, json) {
            fs.writeFileSync(destPath + "package.json", JSON.stringify(json));
        }

        for (var prop in BUILD_TYPES) {
            var buildType = BUILD_TYPES[prop];

            var packageJson = getPackageJson();
            delete packageJson.devDependencies;
            delete packageJson.domains;
            delete packageJson.name;

            packageJson.name = buildType.name;
            packageJson.subdomain = buildType.subdomain;
            packageJson.scripts.start = buildType.start;

            if (buildType.domains) {
                packageJson.domains = buildType.domains;
            }

            writeProductionPackageJson(buildType.buildPath, packageJson);
        }
    }







    //grunt config. jasmine tests and jshint should be handled differently later
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: ["./build"],
        jshint: {
            all: {
                files: {
                    src: [
                        "Gruntfile.js",
                        "src/admin/**/*.js",
                        "src/user/**/*.js",
                        "src/config/**/*.js",
                        "src/models/**/*.js",
                        "src/routes/**/*.js",
                        "src/utils/*.js",
                        "src/*.js",
                        "src/public/js/*.js",

                        "specs/*.js"
                    ]
                }
            }
        },
        jasmine: {
            src: "src/user/editor/props/**/*.js",
            options: {
                specs: "specs/**/*Spec.js",

                template: require("grunt-template-jasmine-requirejs"),
                templateOptions: {
                    requireConfig: {
                        baseUrl: "./src/",
                        paths: {
                            jquery: requireJsPaths.jquery,
                            jqueryui: requireJsPaths.jqueryui,
                            ko: requireJsPaths.ko,
                            colResizable: requireJsPaths.colResizable,
                            ckEditor: "./public/lib/ckeditor/ckeditor",
                            InfoBar: requireJsPaths.InfoBar,
                            validator: requireJsPaths.validator
                        }
                    }
                },

                keepRunner: true
            }
        },
        copy: createAllCopyConfig(),
        requirejs: createCompileConfigs()
    });








    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks("grunt-contrib-requirejs");
    grunt.loadNpmTasks("grunt-contrib-jasmine");

    grunt.registerTask("clean-build", ["clean"]);


    //custom grunt tasks
    grunt.registerTask("buildIndexFiles", "This task builds all the index*.html files.", buildIndexFiles);
    grunt.registerTask("createPackageJsons", "This task generates the proper package.json files.", createPackageJsons);
};
