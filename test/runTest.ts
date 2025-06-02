import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

async function main() {
	try {
		// Create the mocha test
		const mocha = new Mocha({
			ui: 'tdd',
			color: true,
			timeout: 10000
		});

		// The path to the compiled test files
		const testsRoot = path.resolve(__dirname, './suite');

		// Add test files
		const testFiles = glob.sync('**/*.test.js', { cwd: testsRoot });
		
		testFiles.forEach(file => {
			mocha.addFile(path.resolve(testsRoot, file));
		});

		// Run the tests
		const failures = await new Promise<number>((resolve) => {
			mocha.run(resolve);
		});

		if (failures > 0) {
			console.error(`${failures} tests failed.`);
			process.exit(1);
		} else {
			console.log('All tests passed!');
		}
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	}
}

main();
