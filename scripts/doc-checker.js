// Documentation Checker Script
// Run with: node src/doc-checker.js

const fs = require('fs');
const path = require('path');

function checkDocumentation() {
    try {
        // Read package.json
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        // Read README.md
        const readmePath = path.join(__dirname, '..', 'README.md');
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        
        // Read CHANGELOG.md
        const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
        const changelogContent = fs.readFileSync(changelogPath, 'utf8');
        
        // Extract commands from package.json
        const commands = packageData.contributes?.commands || [];
        
        // Check each command
        console.log('\n=== COMMAND DOCUMENTATION CHECK ===');
        commands.forEach(cmd => {
            const commandName = cmd.command;
            const commandTitle = cmd.title;
            
            // Check if command is documented in README
            const isDocumented = readmeContent.includes(commandName);
            
            if (isDocumented) {
                console.log(`✅ Command '${commandName}' is documented in README.md`);
            } else {
                console.log(`❌ UNDOCUMENTED: Command '${commandName}' ('${commandTitle}') is not documented in README.md`);
            }
        });
        
        // Check configuration properties
        console.log('\n=== CONFIGURATION DOCUMENTATION CHECK ===');
        const configProperties = packageData.contributes?.configuration?.properties || {};
        
        for (const propName in configProperties) {
            const propDescription = configProperties[propName].description;
            
            // Check if property is documented in README
            const isDocumented = readmeContent.includes(propName);
            
            if (isDocumented) {
                console.log(`✅ Config property '${propName}' is documented in README.md`);
            } else {
                console.log(`❌ UNDOCUMENTED: Config property '${propName}' ('${propDescription}') is not documented in README.md`);
            }
        }
        
        // Check version consistency
        console.log('\n=== VERSION CONSISTENCY CHECK ===');
        const packageVersion = packageData.version;
        const changelogHasVersion = changelogContent.includes(`[${packageVersion}]`);
        
        if (changelogHasVersion) {
            console.log(`✅ Version ${packageVersion} is documented in CHANGELOG.md`);
        } else {
            console.log(`❌ VERSION MISMATCH: Version ${packageVersion} in package.json is not documented in CHANGELOG.md`);
        }
        
        // Final summary
        console.log('\n=== DOCUMENTATION SUMMARY ===');
        console.log(`Total commands: ${commands.length}`);
        console.log(`Total config properties: ${Object.keys(configProperties).length}`);
        console.log(`Current version: ${packageVersion}`);
        console.log('\nRun this script after making changes to ensure documentation is up to date.');
        
    } catch (error) {
        console.error('Error checking documentation:', error);
    }
}

checkDocumentation(); 