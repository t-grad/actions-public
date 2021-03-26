"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const xmlbuilder2_1 = require("xmlbuilder2");
const ts_dedent_1 = require("ts-dedent");
const M2_DIR = '.m2';
const SETTINGS_FILE = 'settings.xml';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = core.getInput('base-url', { required: true });
            const id = core.getInput('id', { required: true });
            const username = core.getInput('username', { required: true });
            const password = core.getInput('password', { required: true });
            const repos = JSON.parse(core.getInput('repos', { required: true }));
            const pluginRepos = JSON.parse(core.getInput('plugin-repos', { required: true }));
            const settingsPath = core.getInput('settings-path', { required: false });
            core.info(ts_dedent_1.dedent `
      creating ${SETTINGS_FILE} with primary server/id: ${id}
      repos: ${repos}
      plugin-repos: ${pluginRepos}
      environment variables:
        username=$${username}
        password=$${password}
    `);
            // when an alternate m2 location is specified use only that location (no .m2 directory)
            // otherwise use the home/.m2/ path
            const settingsDir = path.join(settingsPath || os.homedir(), settingsPath ? '' : M2_DIR);
            yield io.mkdirP(settingsDir);
            yield write(settingsDir, generate(id, username, password, url, repos, pluginRepos));
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function generateRepo(baseUrl, repo) {
    return {
        id: repo.id,
        url: `${baseUrl}/repository/${repo.repo}`,
        releases: repo.releases,
        snapshots: repo.snapshots
    };
}
function generate(id, username, password, url, repos, pluginRepos) {
    const rs = new Set([id]);
    for (const r of repos) {
        if (r.auth)
            rs.add(r.id);
    }
    for (const r of pluginRepos) {
        if (r.auth)
            rs.add(r.id);
    }
    const authenticatedRepos = [...rs];
    const xmlObj = {
        settings: {
            '@xmlns': 'http://maven.apache.org/SETTINGS/1.0.0',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            '@xsi:schemaLocation': 'http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd',
            activeProfiles: {
                activeProfile: ['nexus']
            },
            profiles: {
                profile: [
                    {
                        id: 'nexus',
                        properties: {
                            'nexus.url': url
                        },
                        repositories: {
                            repository: repos.map(r => generateRepo(url, r))
                        },
                        pluginRepositories: {
                            pluginRepository: pluginRepos.map(r => generateRepo(url, r))
                        }
                    }
                ]
            },
            servers: {
                server: authenticatedRepos.map(r => {
                    return {
                        id: r,
                        username: `\${env.${username}}`,
                        password: `\${env.${password}}`
                    };
                })
            }
        }
    };
    return xmlbuilder2_1.create(xmlObj).end({ headless: true, prettyPrint: true, width: 80 });
}
function write(directory, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        const location = path.join(directory, SETTINGS_FILE);
        if (fs.existsSync(location)) {
            core.warning(`overwriting existing file ${location}`);
        }
        else {
            core.info(`writing ${location}`);
        }
        return fs.writeFileSync(location, settings, {
            encoding: 'utf-8',
            flag: 'w'
        });
    });
}
main();
