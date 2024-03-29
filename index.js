const { chdir } = require('process');
const { execSync } = require('child_process');
const { existsSync, writeFileSync } = require('fs');

const PACKAGE_JSON_PATH = './package.json';

/**
 * Exits the current process with an error code and message
 */
const exit = msg => {
  console.error(msg);
  process.exit(1);
};

/**
 * Executes the provided shell command and redirects stdout/stderr to the console
 */
const run = cmd => execSync(cmd, {
  encoding: 'utf8',
  stdio: 'inherit'
});

/**
 * Exits if the `package.json` file is missing
 */
const verifyPackageJson = () => {
  if (!existsSync(PACKAGE_JSON_PATH)) {
    exit('Missing `package.json` file');
  }
};

/**
 * Determines the current operating system (one of ['mac', 'windows', 'linux'])
 */
const getPlatform = () => {
  switch (process.platform) {
    case 'darwin':
      return 'mac';
    case 'win32':
      return 'windows';
    default:
      return 'linux';
  }
};

/**
 * Parses the environment variable with the provided name. If `required` is set to `true`, the
 * program exits if the variable isn't defined
 */
const getEnvVariable = (name, required = false) => {
  const value = process.env[`INPUT_${name.toUpperCase()}`];
  if (required && (value === undefined || value === null || value === '')) {
    exit(`'${name}' input variable is not defined`);
  }
  return value;
};

/**
 * Sets the specified env variable if the value isn't empty
 */
const setEnvVariable = (name, value) => {
  if (value !== null && value !== undefined && value !== '') {
    process.env[name] = value.toString();
  }
};

/**
 * Installs NPM dependencies and builds/releases the Electron app
 */
const runAction = () => {
  try {
    const workingDirectory = getEnvVariable('working-directory')
    if (workingDirectory) {
      chdir(workingDirectory)
    }
    const platform = getPlatform();

    // Make sure `package.json` file exists
    verifyPackageJson();

    // Copy 'github_token' input variable to 'GH_TOKEN' env variable (required by `electron-builder`)
    setEnvVariable('GH_TOKEN', getEnvVariable('github_token', true));

    // Require code signing certificate and password if building for macOS. Export them to environment
    // variables (required by `electron-builder`)
    if (platform === 'mac') {
      setEnvVariable('CSC_LINK', getEnvVariable('mac_certs'));
      setEnvVariable('CSC_KEY_PASSWORD', getEnvVariable('mac_certs_password'));
    } else if (platform === 'windows') {
      setEnvVariable('CSC_LINK', getEnvVariable('windows_certs'));
      setEnvVariable('CSC_KEY_PASSWORD', getEnvVariable('windows_certs_password'));
    }

    setEnvVariable('BUILD', getEnvVariable('build'))
    setEnvVariable('PROJECT', getEnvVariable('project'))
    setEnvVariable('PROJECT_NAME', getEnvVariable('project_name'))
    setEnvVariable('CI', getEnvVariable('ci'))
    setEnvVariable('GENERATE_SOURCEMAP', getEnvVariable('generate_sourcemap') || false)
    setEnvVariable('ENABLE_AUTH', getEnvVariable('enable_auth') || false)
    setEnvVariable('REACT_APP_MIXPANEL_TOKEN', getEnvVariable('react_app_mixpanel_token'))
    setEnvVariable('PREMIUM_EDITOR', getEnvVariable('premium_editor'))
    setEnvVariable('BUILD_ID', getEnvVariable('build_id'))
    setEnvVariable('COMMIT_ID', getEnvVariable('commit_id').toString())
    setEnvVariable('BUILD_TIME', getEnvVariable('build_time') ? new Date(Number(getEnvVariable('build_time'))).toString() : new Date().toString())

    writeFileSync('.npmrc', `@fortawesome:registry=https://npm.fontawesome.com/\n//npm.fontawesome.com/:_authToken=${getEnvVariable('fontawesome_token')}`)

    // Disable console advertisements during install phase
    setEnvVariable('ADBLOCK', true);

    const buildScript = getEnvVariable('build_script') || 'yarn build';
    run(buildScript);
  } catch (error) {
    console.log(error)
  }
};

runAction();
