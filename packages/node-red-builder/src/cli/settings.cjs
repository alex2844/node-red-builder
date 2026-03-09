const path = require('path');

const cwd = process.cwd();
const userDir = path.join(cwd, '.dev');
const flowFile = path.join(userDir, 'flows.json');

module.exports = {
	userDir, flowFile,
	uiPort: Number(process.env.PORT) || 3000,
	logging: { console: { level: 'debug', metrics: false, audit: false } },
	editorTheme: { tours: false },
	externalModules: { palette: { allowInstall: false } },
	telemetry: { enabled: false, updateNotification: false },
	credentialSecret: false
};
