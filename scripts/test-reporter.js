#!/usr/bin/env node

/**
 * Comprehensive Test Reporter
 * 
 * Combines coverage and performance data to generate a unified test report
 * for CI/CD monitoring and dashboard integration.
 */

const fs = require('fs');
const path = require('path');

class TestReporter {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            summary: {
                overallHealth: 'unknown',
                testsPassing: 0,
                testsTotal: 0,
                coverageScore: 0,
                performanceScore: 0,
                qualityGatesPassed: 0,
                qualityGatesTotal: 5
            },
            coverage: {},
            performance: {},
            qualityGates: {
                testExecution: { passed: false, threshold: 95, actual: 0, weight: 20 },
                codeCoverage: { passed: false, threshold: 80, actual: 0, weight: 25 },
                performanceBenchmarks: { passed: false, threshold: 90, actual: 0, weight: 20 },
                criticalAlerts: { passed: false, threshold: 0, actual: 0, weight: 25 },
                buildStability: { passed: false, threshold: 100, actual: 0, weight: 10 }
            },
            alerts: [],
            recommendations: []
        };
    }

    /**
     * Load coverage data from NYC reports
     */
    loadCoverageData() {
        try {
            // Try to load JSON coverage summary
            const coverageSummaryPath = path.join('coverage', 'coverage-summary.json');
            if (fs.existsSync(coverageSummaryPath)) {
                const coverageData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
                this.report.coverage = coverageData.total || {};
                
                // Calculate weighted coverage score
                const statements = this.report.coverage.statements?.pct || 0;
                const branches = this.report.coverage.branches?.pct || 0;
                const functions = this.report.coverage.functions?.pct || 0;
                const lines = this.report.coverage.lines?.pct || 0;
                
                this.report.summary.coverageScore = Math.round(
                    (statements * 0.3 + branches * 0.3 + functions * 0.2 + lines * 0.2)
                );
                
                // Update quality gate
                this.report.qualityGates.codeCoverage.actual = this.report.summary.coverageScore;
                this.report.qualityGates.codeCoverage.passed = this.report.summary.coverageScore >= 80;
                
            } else {
                this.addAlert('warning', 'Coverage data not found', 'Run npm run test:coverage to generate coverage reports');
            }
        } catch (error) {
            this.addAlert('error', 'Failed to load coverage data', error.message);
        }
    }

    /**
     * Load performance data from performance reporter
     */
    loadPerformanceData() {
        try {
            const performancePath = 'performance-results.json';
            if (fs.existsSync(performancePath)) {
                this.report.performance = JSON.parse(fs.readFileSync(performancePath, 'utf8'));
                
                // Extract test results
                this.report.summary.testsPassing = this.report.performance.summary?.passedTests || 0;
                this.report.summary.testsTotal = this.report.performance.summary?.totalTests || 0;
                this.report.summary.performanceScore = this.report.performance.summary?.performanceScore || 0;
                
                // Update quality gates
                const testPassRate = this.report.summary.testsTotal > 0 ? 
                    (this.report.summary.testsPassing / this.report.summary.testsTotal) * 100 : 0;
                
                this.report.qualityGates.testExecution.actual = Math.round(testPassRate);
                this.report.qualityGates.testExecution.passed = testPassRate >= 95;
                
                this.report.qualityGates.performanceBenchmarks.actual = this.report.summary.performanceScore;
                this.report.qualityGates.performanceBenchmarks.passed = this.report.summary.performanceScore >= 90;
                
                this.report.qualityGates.criticalAlerts.actual = this.report.performance.summary?.criticalAlerts || 0;
                this.report.qualityGates.criticalAlerts.passed = this.report.qualityGates.criticalAlerts.actual === 0;
                
                // Copy performance alerts
                if (this.report.performance.alerts) {
                    this.report.alerts.push(...this.report.performance.alerts);
                }
                
            } else {
                this.addAlert('warning', 'Performance data not found', 'Run npm run report:performance to generate performance reports');
            }
        } catch (error) {
            this.addAlert('error', 'Failed to load performance data', error.message);
        }
    }

    /**
     * Calculate overall health and quality gates
     */
    calculateOverallHealth() {
        // Count passed quality gates
        let passedGates = 0;
        let totalWeight = 0;
        let weightedScore = 0;

        for (const [name, gate] of Object.entries(this.report.qualityGates)) {
            totalWeight += gate.weight;
            if (gate.passed) {
                passedGates++;
                weightedScore += gate.weight;
            }
        }

        this.report.summary.qualityGatesPassed = passedGates;
        this.report.summary.qualityGatesTotal = Object.keys(this.report.qualityGates).length;

        // Calculate weighted health score
        const healthScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
        
        // Determine overall health
        if (healthScore >= 90) {
            this.report.summary.overallHealth = 'excellent';
        } else if (healthScore >= 75) {
            this.report.summary.overallHealth = 'good';
        } else if (healthScore >= 60) {
            this.report.summary.overallHealth = 'fair';
        } else {
            this.report.summary.overallHealth = 'poor';
        }

        // Build stability (no build data available, assume good if other gates pass)
        this.report.qualityGates.buildStability.actual = passedGates >= 3 ? 100 : 75;
        this.report.qualityGates.buildStability.passed = passedGates >= 3;
    }

    /**
     * Generate recommendations based on quality gates
     */
    generateRecommendations() {
        for (const [name, gate] of Object.entries(this.report.qualityGates)) {
            if (!gate.passed) {
                switch (name) {
                    case 'testExecution':
                        this.report.recommendations.push({
                            priority: 'high',
                            category: 'testing',
                            message: 'Fix failing tests to improve test execution rate',
                            action: 'Review and fix failing test cases, ensure test environment is stable'
                        });
                        break;
                    case 'codeCoverage':
                        this.report.recommendations.push({
                            priority: 'medium',
                            category: 'coverage',
                            message: 'Increase code coverage by adding more tests',
                            action: 'Focus on untested functions and edge cases, particularly in low coverage modules'
                        });
                        break;
                    case 'performanceBenchmarks':
                        this.report.recommendations.push({
                            priority: 'medium',
                            category: 'performance',
                            message: 'Optimize performance to meet benchmarks',
                            action: 'Profile slow operations, optimize algorithms, consider caching strategies'
                        });
                        break;
                    case 'criticalAlerts':
                        this.report.recommendations.push({
                            priority: 'critical',
                            category: 'alerts',
                            message: 'Address critical performance or stability issues',
                            action: 'Investigate and fix critical alerts immediately'
                        });
                        break;
                }
            }
        }

        // Add general recommendations based on overall health
        if (this.report.summary.overallHealth === 'poor') {
            this.report.recommendations.push({
                priority: 'critical',
                category: 'general',
                message: 'Multiple quality gates failing - comprehensive review needed',
                action: 'Conduct thorough code review, update testing strategy, check CI/CD pipeline'
            });
        }
    }

    /**
     * Add alert to the report
     */
    addAlert(severity, message, details) {
        this.report.alerts.push({
            type: 'system',
            severity,
            message,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate the complete test report
     */
    generateReport() {
        this.loadCoverageData();
        this.loadPerformanceData();
        this.calculateOverallHealth();
        this.generateRecommendations();

        return this.report;
    }

    /**
     * Save report to file and display summary
     */
    saveReport(filename = 'test-report.json') {
        const report = this.generateReport();
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        this.displaySummary(report, filename);
        return report;
    }

    /**
     * Display formatted summary
     */
    displaySummary(report, filename = 'test-report.json') {
        console.log('\n📊 Comprehensive Test Report');
        console.log('═'.repeat(50));
        
        // Overall health
        const healthEmoji = {
            'excellent': '🟢',
            'good': '🟡',
            'fair': '🟠',
            'poor': '🔴'
        };
        
        console.log(`\n${healthEmoji[report.summary.overallHealth]} Overall Health: ${report.summary.overallHealth.toUpperCase()}`);
        console.log(`📋 Quality Gates: ${report.summary.qualityGatesPassed}/${report.summary.qualityGatesTotal} passed`);
        
        // Test execution
        console.log(`\n✅ Test Execution: ${report.summary.testsPassing}/${report.summary.testsTotal} tests passing`);
        
        // Coverage
        if (report.coverage.statements) {
            console.log(`📈 Coverage: ${report.summary.coverageScore}% (Statements: ${report.coverage.statements.pct}%, Branches: ${report.coverage.branches.pct}%)`);
        }
        
        // Performance
        if (report.performance.summary) {
            console.log(`⚡ Performance: ${report.summary.performanceScore}/100 score`);
        }
        
        // Quality gates details
        console.log('\n🎯 Quality Gates:');
        for (const [name, gate] of Object.entries(report.qualityGates)) {
            const status = gate.passed ? '✅' : '❌';
            const displayName = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            console.log(`   ${status} ${displayName}: ${gate.actual}% (threshold: ${gate.threshold}%)`);
        }
        
        // Alerts
        if (report.alerts.length > 0) {
            console.log('\n🚨 Alerts:');
            report.alerts.forEach(alert => {
                const emoji = alert.severity === 'error' ? '🔴' : alert.severity === 'warning' ? '🟡' : 'ℹ️';
                console.log(`   ${emoji} ${alert.severity.toUpperCase()}: ${alert.message}`);
            });
        }
        
        // Recommendations
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => {
                const emoji = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : '🟡';
                console.log(`   ${emoji} ${rec.priority.toUpperCase()} [${rec.category}]: ${rec.message}`);
            });
        }
        
        console.log(`\n📄 Full report saved to: ${filename}`);
    }
}

// Main execution
if (require.main === module) {
    const reporter = new TestReporter();
    const report = reporter.saveReport();
    
    // Exit with error code if overall health is poor
    if (report.summary.overallHealth === 'poor' || report.summary.qualityGatesPassed < 3) {
        process.exit(1);
    }
}

module.exports = TestReporter; 