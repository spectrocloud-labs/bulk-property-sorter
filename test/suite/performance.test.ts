import * as assert from 'assert';
import { PropertySorter } from '../../src/sorter';
import { CoreProcessor } from '../../src/coreProcessor';
import { ParsedProperty } from '../../src/types';

// Performance testing utilities
class PerformanceTimer {
    private startTime: number = 0;
    private measurements: number[] = [];

    start(): void {
        this.startTime = performance.now();
    }

    stop(): number {
        const elapsed = performance.now() - this.startTime;
        this.measurements.push(elapsed);
        return elapsed;
    }

    getAverage(): number {
        return this.measurements.reduce((sum, time) => sum + time, 0) / this.measurements.length;
    }

    getMedian(): number {
        const sorted = [...this.measurements].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    getMax(): number {
        return Math.max(...this.measurements);
    }

    getMin(): number {
        return Math.min(...this.measurements);
    }

    reset(): void {
        this.measurements = [];
    }
}

class MemoryTracker {
    private initialMemory: number = 0;

    start(): void {
        if (global.gc) {
            global.gc();
        }
        this.initialMemory = process.memoryUsage().heapUsed;
    }

    getUsage(): number {
        return process.memoryUsage().heapUsed - this.initialMemory;
    }

    getUsageMB(): number {
        return this.getUsage() / (1024 * 1024);
    }
}

function generateLargeInterface(propertyCount: number, nestedLevels: number = 0): string {
    let properties = '';
    
    for (let i = 0; i < propertyCount; i++) {
        const propName = `property${i.toString().padStart(4, '0')}`;
        const optional = i % 3 === 0 ? '?' : '';
        
        if (nestedLevels > 0 && i % 10 === 0) {
            // Add nested objects periodically
            properties += `    ${propName}${optional}: {\n`;
            for (let j = 0; j < Math.min(5, nestedLevels); j++) {
                properties += `        nested${j}: string;\n`;
            }
            properties += `    };\n`;
        } else {
            const types = ['string', 'number', 'boolean', 'Date', 'Array<string>', 'Record<string, any>'];
            const type = types[i % types.length];
            properties += `    ${propName}${optional}: ${type};\n`;
        }
    }
    
    return `interface LargeInterface {\n${properties}}`;
}

function generateLargeCSSFile(ruleCount: number, propertiesPerRule: number = 10): string {
    let css = '';
    
    for (let i = 0; i < ruleCount; i++) {
        css += `.rule-${i} {\n`;
        
        for (let j = 0; j < propertiesPerRule; j++) {
            const properties = [
                'margin', 'padding', 'width', 'height', 'color', 'background-color',
                'font-size', 'font-weight', 'text-align', 'display', 'position',
                'top', 'left', 'border', 'border-radius', 'z-index', 'opacity'
            ];
            const prop = properties[j % properties.length];
            css += `    ${prop}: ${j}px;\n`;
        }
        
        css += '}\n\n';
    }
    
    return css;
}

function generateLargeGoStruct(fieldCount: number): string {
    let fields = '';
    
    for (let i = 0; i < fieldCount; i++) {
        const fieldName = `Field${i.toString().padStart(4, '0')}`;
        const types = ['string', 'int', 'float64', 'bool', 'time.Time', '[]string', 'map[string]interface{}'];
        const type = types[i % types.length];
        const tag = i % 5 === 0 ? ` \`json:"field${i}"\`` : '';
        fields += `    ${fieldName} ${type}${tag}\n`;
    }
    
    return `type LargeStruct struct {\n${fields}}`;
}

suite('Performance and Stress Tests', () => {
    let sorter: PropertySorter;
    let coreProcessor: CoreProcessor;
    let timer: PerformanceTimer;
    let memoryTracker: MemoryTracker;

    setup(() => {
        sorter = new PropertySorter();
        coreProcessor = new CoreProcessor();
        timer = new PerformanceTimer();
        memoryTracker = new MemoryTracker();
    });

    suite('Large File Processing Performance', () => {
        test('Process interface with 1000 properties', () => {
            const largeInterface = generateLargeInterface(1000);
            
            timer.start();
            const result = coreProcessor.processText(largeInterface, { sortOrder: 'asc' });
            const elapsed = timer.stop();
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);
            
            // Should complete within 2 seconds for 1000 properties
            assert.ok(elapsed < 2000, `Processing took ${elapsed}ms, should be under 2000ms`);
            console.log(`    📊 1000 properties processed in ${elapsed.toFixed(2)}ms`);
        });

        test('Process interface with 5000 properties', () => {
            const largeInterface = generateLargeInterface(5000);
            
            memoryTracker.start();
            timer.start();
            const result = coreProcessor.processText(largeInterface, { sortOrder: 'asc' });
            const elapsed = timer.stop();
            const memoryUsed = memoryTracker.getUsageMB();
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);
            
            // Should complete within 10 seconds for 5000 properties
            assert.ok(elapsed < 10000, `Processing took ${elapsed}ms, should be under 10000ms`);
            
            // Memory usage should be reasonable (less than 100MB)
            assert.ok(memoryUsed < 100, `Memory usage ${memoryUsed.toFixed(2)}MB should be under 100MB`);
            
            console.log(`    📊 5000 properties processed in ${elapsed.toFixed(2)}ms, using ${memoryUsed.toFixed(2)}MB`);
        });

        test('Process CSS file with 500 rules', () => {
            const largeCSSFile = generateLargeCSSFile(500, 15);
            
            timer.start();
            const result = coreProcessor.processText(largeCSSFile, { 
                fileType: 'css',
                sortOrder: 'asc' 
            });
            const elapsed = timer.stop();
            
            assert.strictEqual(result.success, true);
            assert.ok(result.entitiesProcessed > 0);
            
            // Should complete within 5 seconds for 500 CSS rules
            assert.ok(elapsed < 5000, `CSS processing took ${elapsed}ms, should be under 5000ms`);
            console.log(`    📊 500 CSS rules processed in ${elapsed.toFixed(2)}ms`);
        });

        test('Process Go struct with 2000 fields', () => {
            const largeGoStruct = generateLargeGoStruct(2000);
            
            timer.start();
            const result = coreProcessor.processText(largeGoStruct, { 
                fileType: 'go',
                sortOrder: 'asc' 
            });
            const elapsed = timer.stop();
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);
            
            // Should complete within 3 seconds for 2000 Go fields
            assert.ok(elapsed < 3000, `Go processing took ${elapsed}ms, should be under 3000ms`);
            console.log(`    📊 2000 Go struct fields processed in ${elapsed.toFixed(2)}ms`);
        });
    });

    suite('Memory Usage and Leak Tests', () => {
        test('Memory stability with repeated processing', () => {
            const testInterface = generateLargeInterface(100);
            const iterations = 50;
            const memoryMeasurements: number[] = [];
            
            // Warm up
            for (let i = 0; i < 5; i++) {
                coreProcessor.processText(testInterface, { sortOrder: 'asc' });
            }
            
            // Measure memory usage over multiple iterations
            for (let i = 0; i < iterations; i++) {
                if (global.gc && i % 10 === 0) {
                    global.gc();
                }
                
                memoryTracker.start();
                coreProcessor.processText(testInterface, { sortOrder: 'asc' });
                memoryMeasurements.push(memoryTracker.getUsageMB());
            }
            
            // Check for memory leaks - memory usage shouldn't grow significantly
            const initialMemory = memoryMeasurements.slice(0, 5).reduce((sum, mem) => sum + mem, 0) / 5;
            const finalMemory = memoryMeasurements.slice(-5).reduce((sum, mem) => sum + mem, 0) / 5;
            const memoryGrowth = finalMemory - initialMemory;
            
            assert.ok(memoryGrowth < 10, `Memory growth ${memoryGrowth.toFixed(2)}MB should be under 10MB`);
            console.log(`    📊 Memory growth over ${iterations} iterations: ${memoryGrowth.toFixed(2)}MB`);
        });

        test('Memory usage with deeply nested objects', () => {
            let nestedObject = 'deepValue: "test"';
            for (let i = 0; i < 50; i++) {
                nestedObject = `level${i}: { ${nestedObject} }`;
            }
            const deeplyNested = `const config = { ${nestedObject} };`;
            
            memoryTracker.start();
            timer.start();
            const result = coreProcessor.processText(deeplyNested, { 
                sortNestedObjects: true,
                sortOrder: 'asc'
            });
            const elapsed = timer.stop();
            const memoryUsed = memoryTracker.getUsageMB();
            
            assert.strictEqual(result.success, true);
            
            // Should handle deep nesting without excessive memory usage
            assert.ok(memoryUsed < 50, `Memory usage ${memoryUsed.toFixed(2)}MB should be under 50MB`);
            assert.ok(elapsed < 1000, `Processing took ${elapsed}ms, should be under 1000ms`);
            
            console.log(`    📊 50-level nesting processed in ${elapsed.toFixed(2)}ms, using ${memoryUsed.toFixed(2)}MB`);
        });
    });

    suite('Stress Testing - Edge Cases', () => {
        test('Stress test with many duplicate property names', () => {
            const properties: ParsedProperty[] = [];
            const duplicateCount = 10000;
            
            timer.start();
            for (let i = 0; i < duplicateCount; i++) {
                properties.push({
                    name: 'duplicate',
                    value: `"value${i}"`,
                    optional: false,
                    line: i,
                    fullText: `duplicate: "value${i}"`,
                    trailingPunctuation: ';',
                    comments: []
                });
            }
            
            const sorted = sorter.sortProperties(properties);
            const elapsed = timer.stop();
            
            assert.strictEqual(sorted.length, duplicateCount);
            assert.ok(sorted.every(p => p.name === 'duplicate'));
            
            // Should handle many duplicates efficiently
            assert.ok(elapsed < 500, `Sorting ${duplicateCount} duplicates took ${elapsed}ms, should be under 500ms`);
            console.log(`    📊 ${duplicateCount} duplicate properties sorted in ${elapsed.toFixed(2)}ms`);
        });

        test('Stress test with complex property types', () => {
            let complexInterface = 'interface ComplexInterface {\n';
            
            for (let i = 0; i < 500; i++) {
                const complexTypes = [
                    `prop${i}: Promise<Array<Record<string, Map<number, Set<Date>>>>>`,
                    `method${i}: <T extends keyof U, U = Record<string, any>>(param: T) => U[T]`,
                    `generic${i}: { [K in keyof T]: T[K] extends string ? number : T[K] }`,
                    `conditional${i}: T extends U ? V extends W ? X : Y : Z`,
                    `mapped${i}: { readonly [P in keyof T]?: T[P] | null }`
                ];
                complexInterface += `    ${complexTypes[i % complexTypes.length]};\n`;
            }
            complexInterface += '}';
            
            timer.start();
            const result = coreProcessor.processText(complexInterface, { sortOrder: 'asc' });
            const elapsed = timer.stop();
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);
            
            // Should handle complex types within reasonable time
            assert.ok(elapsed < 3000, `Complex types processing took ${elapsed}ms, should be under 3000ms`);
            console.log(`    📊 500 complex type properties processed in ${elapsed.toFixed(2)}ms`);
        });

        test('Stress test with mixed content and comments', () => {
            let mixedContent = 'interface MixedInterface {\n';
            
            for (let i = 0; i < 1000; i++) {
                const commentTypes = [
                    `    // Single line comment for property ${i}\n    prop${i}: string;\n`,
                    `    /* Multi-line comment\n       for property ${i} */\n    prop${i}: number;\n`,
                    `    prop${i}: boolean; // Inline comment ${i}\n`,
                    `    /**\n     * JSDoc comment for property ${i}\n     * @type {Date}\n     */\n    prop${i}: Date;\n`
                ];
                mixedContent += commentTypes[i % commentTypes.length];
            }
            mixedContent += '}';
            
            timer.start();
            const result = coreProcessor.processText(mixedContent, { 
                sortOrder: 'asc',
                includeComments: true 
            });
            const elapsed = timer.stop();
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);
            
            // Should preserve comments while maintaining performance
            assert.ok(elapsed < 2000, `Mixed content processing took ${elapsed}ms, should be under 2000ms`);
            assert.ok(result.processedText!.includes('Single line comment'));
            assert.ok(result.processedText!.includes('Multi-line comment'));
            assert.ok(result.processedText!.includes('JSDoc comment'));
            
            console.log(`    📊 1000 properties with mixed comments processed in ${elapsed.toFixed(2)}ms`);
        });
    });

    suite('Concurrent Processing Stress Test', () => {
        test('Multiple simultaneous processing operations', async () => {
            const interfaces = [
                generateLargeInterface(200),
                generateLargeInterface(200),
                generateLargeInterface(200),
                generateLargeInterface(200),
                generateLargeInterface(200)
            ];
            
            timer.start();
            
            const promises = interfaces.map(async (interfaceCode, index) => {
                return new Promise<boolean>((resolve) => {
                    setTimeout(() => {
                        const result = coreProcessor.processText(interfaceCode, { sortOrder: 'asc' });
                        resolve(result.success);
                    }, index * 10); // Stagger the starts slightly
                });
            });
            
            const results = await Promise.all(promises);
            const elapsed = timer.stop();
            
            assert.ok(results.every(success => success === true));
            
            // Should handle concurrent processing efficiently
            assert.ok(elapsed < 5000, `Concurrent processing took ${elapsed}ms, should be under 5000ms`);
            console.log(`    📊 5 concurrent operations completed in ${elapsed.toFixed(2)}ms`);
        });
    });

    suite('Performance Regression Tests', () => {
        test('Baseline performance benchmarks', () => {
            const benchmarks = [
                { name: 'Small interface (10 props)', code: generateLargeInterface(10), maxTime: 50 },
                { name: 'Medium interface (100 props)', code: generateLargeInterface(100), maxTime: 200 },
                { name: 'Large interface (500 props)', code: generateLargeInterface(500), maxTime: 1000 },
                { name: 'CSS rules (50 rules)', code: generateLargeCSSFile(50, 10), maxTime: 300 },
                { name: 'Go struct (100 fields)', code: generateLargeGoStruct(100), maxTime: 200 }
            ];
            
            console.log('    📊 Performance Benchmarks:');
            
            benchmarks.forEach(benchmark => {
                const iterations = 10;
                const times: number[] = [];
                
                // Run multiple iterations for more reliable results
                for (let i = 0; i < iterations; i++) {
                    timer.start();
                    const result = coreProcessor.processText(benchmark.code, { 
                        sortOrder: 'asc',
                        fileType: benchmark.name.includes('CSS') ? 'css' : 
                                 benchmark.name.includes('Go') ? 'go' : 'typescript'
                    });
                    const elapsed = timer.stop();
                    
                    assert.strictEqual(result.success, true);
                    times.push(elapsed);
                }
                
                const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
                const maxTime = Math.max(...times);
                const minTime = Math.min(...times);
                
                assert.ok(avgTime < benchmark.maxTime, 
                    `${benchmark.name} average time ${avgTime.toFixed(2)}ms should be under ${benchmark.maxTime}ms`);
                
                console.log(`      ${benchmark.name}: avg=${avgTime.toFixed(2)}ms, min=${minTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);
            });
        });
    });

    suite('Resource Usage Monitoring', () => {
        test('CPU usage during intensive processing', () => {
            const largeInterface = generateLargeInterface(2000, 5);
            
            // Measure processing time for CPU usage estimation
            const startTime = process.hrtime.bigint();
            const result = coreProcessor.processText(largeInterface, { 
                sortOrder: 'asc',
                sortNestedObjects: true 
            });
            const endTime = process.hrtime.bigint();
            
            const processingTimeMs = Number(endTime - startTime) / 1000000;
            
            assert.strictEqual(result.success, true);
            
            // Processing should be efficient - not excessive CPU time
            assert.ok(processingTimeMs < 5000, 
                `CPU time ${processingTimeMs.toFixed(2)}ms should be under 5000ms`);
            
            console.log(`    📊 CPU time for 2000 properties with nesting: ${processingTimeMs.toFixed(2)}ms`);
        });

        test('File size impact on performance', () => {
            const fileSizes = [1, 5, 10, 25, 50]; // KB (approximate)
            const results: { size: number; time: number; }[] = [];
            
            fileSizes.forEach(sizeKB => {
                // Estimate properties needed for target file size
                const propertiesPerKB = 15; // Rough estimate
                const propertyCount = sizeKB * propertiesPerKB;
                const testCode = generateLargeInterface(propertyCount);
                
                timer.start();
                const result = coreProcessor.processText(testCode, { sortOrder: 'asc' });
                const elapsed = timer.stop();
                
                assert.strictEqual(result.success, true);
                results.push({ size: sizeKB, time: elapsed });
            });
            
            // Performance should scale reasonably with file size
            console.log('    📊 File Size vs Processing Time:');
            results.forEach(result => {
                console.log(`      ${result.size}KB: ${result.time.toFixed(2)}ms`);
            });
            
            // Ensure performance doesn't degrade exponentially
            const timeRatio = results[results.length - 1].time / results[0].time;
            const sizeRatio = results[results.length - 1].size / results[0].size;
            
            assert.ok(timeRatio < sizeRatio * 2, 
                `Time ratio ${timeRatio.toFixed(2)} should not be more than 2x the size ratio ${sizeRatio}`);
        });
    });
}); 