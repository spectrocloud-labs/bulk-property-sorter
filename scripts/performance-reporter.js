#!/usr/bin/env node

/**
 * Performance Reporter Script
 * 
 * This script extracts performance metrics from test output and generates
 * a structured JSON report for CI/CD monitoring and alerting.
 */

const fs = require('fs');
const path = require('path');

class PerformanceReporter {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                averageExecutionTime: 0
            },
            benchmarks: {},
            thresholds: {
                largeFileProcessing: 2000, // ms
                memoryLeakGrowth: 10, // MB
                concurrentOperations: 5000, // ms
                stressTestDuplicates: 500 // ms
            },
            alerts: []
        };
    }

    /**
     * Parse test output and extract performance metrics
     */
    parseTestOutput(testOutput) {
        const lines = testOutput.split('\n');
        let currentSuite = null;
        
        for (const line of lines) {
            // Extract performance metrics from console.log statements
            if (line.includes('📊')) {
                this.extractMetric(line);
            }
            
            // Track test results
            if (line.includes('✔') || line.includes('✓')) {
                this.results.summary.passedTests++;
            } else if (line.includes('✗') || line.includes('×')) {
                this.results.summary.failedTests++;
            }
            
            // Extract timing information
            const timingMatch = line.match(/\((\d+)ms\)/);
            if (timingMatch) {
                const time = parseInt(timingMatch[1]);
                this.addTiming(time);
            }
        }
        
        this.results.summary.totalTests = this.results.summary.passedTests + this.results.summary.failedTests;
        this.checkThresholds();
    }

    /**
     * Extract specific performance metrics from log lines
     */
    extractMetric(line) {
        // Large file processing
        if (line.includes('properties processed in')) {
            const match = line.match(/(\d+) properties processed in ([\d.]+)ms/);
            if (match) {
                const [, count, time] = match;
                this.results.benchmarks.largeFileProcessing = {
                    propertyCount: parseInt(count),
                    time: parseFloat(time),
                    throughput: parseInt(count) / parseFloat(time) * 1000 // properties per second
                };
            }
        }
        
        // Memory usage
        if (line.includes('using') && line.includes('MB')) {
            const match = line.match(/using ([\d.]+)MB/);
            if (match) {
                this.results.benchmarks.memoryUsage = {
                    peak: parseFloat(match[1])
                };
            }
        }
        
        // Memory growth
        if (line.includes('Memory growth over')) {
            const match = line.match(/Memory growth over \d+ iterations: ([\d.-]+)MB/);
            if (match) {
                this.results.benchmarks.memoryLeaks = {
                    growth: parseFloat(match[1])
                };
            }
        }
        
        // Concurrent operations
        if (line.includes('concurrent operations completed')) {
            const match = line.match(/(\d+) concurrent operations completed in ([\d.]+)ms/);
            if (match) {
                this.results.benchmarks.concurrentProcessing = {
                    operations: parseInt(match[1]),
                    time: parseFloat(match[2])
                };
            }
        }
        
        // Stress test results
        if (line.includes('duplicate properties sorted')) {
            const match = line.match(/(\d+) duplicate properties sorted in ([\d.]+)ms/);
            if (match) {
                this.results.benchmarks.stressTestDuplicates = {
                    count: parseInt(match[1]),
                    time: parseFloat(match[2])
                };
            }
        }
        
        // CPU time
        if (line.includes('CPU time for')) {
            const match = line.match(/CPU time for .+: ([\d.]+)ms/);
            if (match) {
                this.results.benchmarks.cpuUsage = {
                    intensiveProcessing: parseFloat(match[1])
                };
            }
        }
    }

    /**
     * Add timing information for average calculation
     */
    addTiming(time) {
        if (!this.results.timings) {
            this.results.timings = [];
        }
        this.results.timings.push(time);
        
        // Calculate running average
        const sum = this.results.timings.reduce((a, b) => a + b, 0);
        this.results.summary.averageExecutionTime = sum / this.results.timings.length;
    }

    /**
     * Check performance thresholds and generate alerts
     */
    checkThresholds() {
        const { benchmarks, thresholds } = this.results;
        
        // Check large file processing threshold
        if (benchmarks.largeFileProcessing && benchmarks.largeFileProcessing.time > thresholds.largeFileProcessing) {
            this.results.alerts.push({
                type: 'performance',
                severity: 'warning',
                message: `Large file processing exceeded threshold: ${benchmarks.largeFileProcessing.time}ms > ${thresholds.largeFileProcessing}ms`,
                metric: 'largeFileProcessing',
                actual: benchmarks.largeFileProcessing.time,
                threshold: thresholds.largeFileProcessing
            });
        }
        
        // Check memory leak threshold
        if (benchmarks.memoryLeaks && benchmarks.memoryLeaks.growth > thresholds.memoryLeakGrowth) {
            this.results.alerts.push({
                type: 'memory',
                severity: 'error',
                message: `Memory leak detected: ${benchmarks.memoryLeaks.growth}MB > ${thresholds.memoryLeakGrowth}MB`,
                metric: 'memoryLeaks',
                actual: benchmarks.memoryLeaks.growth,
                threshold: thresholds.memoryLeakGrowth
            });
        }
        
        // Check concurrent processing threshold
        if (benchmarks.concurrentProcessing && benchmarks.concurrentProcessing.time > thresholds.concurrentOperations) {
            this.results.alerts.push({
                type: 'performance',
                severity: 'warning',
                message: `Concurrent processing exceeded threshold: ${benchmarks.concurrentProcessing.time}ms > ${thresholds.concurrentOperations}ms`,
                metric: 'concurrentProcessing',
                actual: benchmarks.concurrentProcessing.time,
                threshold: thresholds.concurrentOperations
            });
        }
        
        // Check stress test threshold
        if (benchmarks.stressTestDuplicates && benchmarks.stressTestDuplicates.time > thresholds.stressTestDuplicates) {
            this.results.alerts.push({
                type: 'performance',
                severity: 'warning',
                message: `Stress test exceeded threshold: ${benchmarks.stressTestDuplicates.time}ms > ${thresholds.stressTestDuplicates}ms`,
                metric: 'stressTestDuplicates',
                actual: benchmarks.stressTestDuplicates.time,
                threshold: thresholds.stressTestDuplicates
            });
        }
    }

    /**
     * Generate performance report
     */
    generateReport() {
        // Add summary statistics
        this.results.summary.alertCount = this.results.alerts.length;
        this.results.summary.criticalAlerts = this.results.alerts.filter(a => a.severity === 'error').length;
        this.results.summary.warningAlerts = this.results.alerts.filter(a => a.severity === 'warning').length;
        
        // Calculate performance score (0-100)
        let score = 100;
        score -= this.results.summary.criticalAlerts * 20;
        score -= this.results.summary.warningAlerts * 10;
        score -= this.results.summary.failedTests * 5;
        this.results.summary.performanceScore = Math.max(0, score);
        
        return this.results;
    }

    /**
     * Save report to file
     */
    saveReport(filename = 'performance-results.json') {
        const report = this.generateReport();
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));
        
        console.log(`📊 Performance Report Generated: ${filename}`);
        console.log(`   Total Tests: ${report.summary.totalTests}`);
        console.log(`   Passed: ${report.summary.passedTests}`);
        console.log(`   Failed: ${report.summary.failedTests}`);
        console.log(`   Performance Score: ${report.summary.performanceScore}/100`);
        console.log(`   Alerts: ${report.summary.alertCount} (${report.summary.criticalAlerts} critical, ${report.summary.warningAlerts} warnings)`);
        
        if (report.alerts.length > 0) {
            console.log('\n🚨 Performance Alerts:');
            report.alerts.forEach(alert => {
                console.log(`   ${alert.severity.toUpperCase()}: ${alert.message}`);
            });
        }
        
        return report;
    }
}

// Main execution
if (require.main === module) {
    const reporter = new PerformanceReporter();
    
    // Read test output from stdin or file
    let testOutput = '';
    
    if (process.argv[2]) {
        // Read from file
        const filename = process.argv[2];
        if (fs.existsSync(filename)) {
            testOutput = fs.readFileSync(filename, 'utf8');
        } else {
            console.error(`File not found: ${filename}`);
            process.exit(1);
        }
    } else {
        // Read from stdin
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => {
            const chunk = process.stdin.read();
            if (chunk !== null) {
                testOutput += chunk;
            }
        });
        
        process.stdin.on('end', () => {
            processOutput();
        });
        
        return;
    }
    
    function processOutput() {
        reporter.parseTestOutput(testOutput);
        const report = reporter.saveReport();
        
        // Exit with error code if there are critical alerts
        if (report.summary.criticalAlerts > 0) {
            process.exit(1);
        }
    }
    
    if (testOutput) {
        processOutput();
    }
}

module.exports = PerformanceReporter; 