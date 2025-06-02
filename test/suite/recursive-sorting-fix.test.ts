import * as assert from 'assert';
import { processText } from '../../src/coreProcessor';

suite('Recursive Sorting Fix Tests', () => {
    test('should recursively sort nested object properties in type alias', () => {
        const testCode = `export type CanvasConfig = {
    enableHTTP: string
    oidc: {
        issuerURL: string
        clientId: string
        clientSecret: string
        sessionSecret: string
        audience: string
        sessionDir: string
        issuerK8sService: string
        sslCertificateVerification: boolean
        redirectURL: string
    }
    impersonationProxy: {
        enabled: boolean
        usernameClaim: string
        groupsClaim: string
        userMode: string
        groupsMode: string
        userMap: Record<string, string>
        groupMap: Record<string, string>
        dexGroupMap: Record<string, string>
    }
}`;

        const result = processText(testCode, {
            sortOrder: 'asc',
            preserveFormatting: true,
            includeComments: true,
            indentation: '  ',
            sortNestedObjects: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Check that top-level properties are sorted
        const lines = result.processedText.split('\n');
        const enableHTTPIndex = lines.findIndex(line => line.includes('enableHTTP:'));
        const impersonationProxyIndex = lines.findIndex(line => line.includes('impersonationProxy:'));
        const oidcIndex = lines.findIndex(line => line.includes('oidc:'));
        
        assert.ok(enableHTTPIndex < impersonationProxyIndex, 'enableHTTP should come before impersonationProxy');
        assert.ok(impersonationProxyIndex < oidcIndex, 'impersonationProxy should come before oidc');

        // Check that nested properties in oidc are sorted
        const oidcStartIndex = oidcIndex;
        const oidcEndIndex = lines.findIndex((line, index) => index > oidcStartIndex && line.includes('}'));
        const oidcSection = lines.slice(oidcStartIndex, oidcEndIndex + 1).join('\n');
        
        // Check that oidc properties are sorted alphabetically
        assert.ok(oidcSection.indexOf('audience:') < oidcSection.indexOf('clientId:'), 'audience should come before clientId in oidc');
        assert.ok(oidcSection.indexOf('clientId:') < oidcSection.indexOf('clientSecret:'), 'clientId should come before clientSecret in oidc');
        assert.ok(oidcSection.indexOf('clientSecret:') < oidcSection.indexOf('issuerK8sService:'), 'clientSecret should come before issuerK8sService in oidc');
        assert.ok(oidcSection.indexOf('issuerK8sService:') < oidcSection.indexOf('issuerURL:'), 'issuerK8sService should come before issuerURL in oidc');
        assert.ok(oidcSection.indexOf('issuerURL:') < oidcSection.indexOf('redirectURL:'), 'issuerURL should come before redirectURL in oidc');
        assert.ok(oidcSection.indexOf('redirectURL:') < oidcSection.indexOf('sessionDir:'), 'redirectURL should come before sessionDir in oidc');
        assert.ok(oidcSection.indexOf('sessionDir:') < oidcSection.indexOf('sessionSecret:'), 'sessionDir should come before sessionSecret in oidc');
        assert.ok(oidcSection.indexOf('sessionSecret:') < oidcSection.indexOf('sslCertificateVerification:'), 'sessionSecret should come before sslCertificateVerification in oidc');

        // Check that nested properties in impersonationProxy are sorted
        const impersonationProxyStartIndex = impersonationProxyIndex;
        const impersonationProxyEndIndex = lines.findIndex((line, index) => index > impersonationProxyStartIndex && line.includes('}'));
        const impersonationProxySection = lines.slice(impersonationProxyStartIndex, impersonationProxyEndIndex + 1).join('\n');
        
        // Check that impersonationProxy properties are sorted alphabetically
        assert.ok(impersonationProxySection.indexOf('dexGroupMap:') < impersonationProxySection.indexOf('enabled:'), 'dexGroupMap should come before enabled in impersonationProxy');
        assert.ok(impersonationProxySection.indexOf('enabled:') < impersonationProxySection.indexOf('groupMap:'), 'enabled should come before groupMap in impersonationProxy');
        assert.ok(impersonationProxySection.indexOf('groupMap:') < impersonationProxySection.indexOf('groupsClaim:'), 'groupMap should come before groupsClaim in impersonationProxy');
        assert.ok(impersonationProxySection.indexOf('groupsClaim:') < impersonationProxySection.indexOf('groupsMode:'), 'groupsClaim should come before groupsMode in impersonationProxy');
        assert.ok(impersonationProxySection.indexOf('groupsMode:') < impersonationProxySection.indexOf('userMap:'), 'groupsMode should come before userMap in impersonationProxy');
        assert.ok(impersonationProxySection.indexOf('userMap:') < impersonationProxySection.indexOf('userMode:'), 'userMap should come before userMode in impersonationProxy');
        assert.ok(impersonationProxySection.indexOf('userMode:') < impersonationProxySection.indexOf('usernameClaim:'), 'userMode should come before usernameClaim in impersonationProxy');
    });

    test('should not recursively sort when sortNestedObjects is false', () => {
        const testCode = `export type CanvasConfig = {
    enableHTTP: string
    oidc: {
        issuerURL: string
        clientId: string
        clientSecret: string
    }
    impersonationProxy: {
        enabled: boolean
        usernameClaim: string
        groupsClaim: string
    }
}`;

        const result = processText(testCode, {
            sortOrder: 'asc',
            preserveFormatting: true,
            includeComments: true,
            indentation: '  ',
            sortNestedObjects: false
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Check that top-level properties are sorted
        const lines = result.processedText.split('\n');
        const enableHTTPIndex = lines.findIndex(line => line.includes('enableHTTP:'));
        const impersonationProxyIndex = lines.findIndex(line => line.includes('impersonationProxy:'));
        const oidcIndex = lines.findIndex(line => line.includes('oidc:'));
        
        assert.ok(enableHTTPIndex < impersonationProxyIndex, 'enableHTTP should come before impersonationProxy');
        assert.ok(impersonationProxyIndex < oidcIndex, 'impersonationProxy should come before oidc');

        // Check that nested properties in oidc maintain original order
        const oidcStartIndex = oidcIndex;
        const oidcEndIndex = lines.findIndex((line, index) => index > oidcStartIndex && line.includes('}'));
        const oidcSection = lines.slice(oidcStartIndex, oidcEndIndex + 1).join('\n');
        
        // Properties should maintain original order (issuerURL, clientId, clientSecret)
        assert.ok(oidcSection.indexOf('issuerURL:') < oidcSection.indexOf('clientId:'), 'issuerURL should come before clientId in oidc (original order)');
        assert.ok(oidcSection.indexOf('clientId:') < oidcSection.indexOf('clientSecret:'), 'clientId should come before clientSecret in oidc (original order)');

        // Check that nested properties in impersonationProxy maintain original order
        const impersonationProxyStartIndex = impersonationProxyIndex;
        const impersonationProxyEndIndex = lines.findIndex((line, index) => index > impersonationProxyStartIndex && line.includes('}'));
        const impersonationProxySection = lines.slice(impersonationProxyStartIndex, impersonationProxyEndIndex + 1).join('\n');
        
        // Properties should maintain original order (enabled, usernameClaim, groupsClaim)
        assert.ok(impersonationProxySection.indexOf('enabled:') < impersonationProxySection.indexOf('usernameClaim:'), 'enabled should come before usernameClaim in impersonationProxy (original order)');
        assert.ok(impersonationProxySection.indexOf('usernameClaim:') < impersonationProxySection.indexOf('groupsClaim:'), 'usernameClaim should come before groupsClaim in impersonationProxy (original order)');
    });
}); 