import * as vscode from 'vscode'

/**
 * Interface representing tab information tracked by the TabManager
 */
export interface TabInfo {
    /** The URI of the tab's document */
    uri: vscode.Uri
    /** The last time this tab was accessed */
    lastAccessTime: number
    /** The ID of the tab group this tab belongs to */
    groupId: number
    /** The tab object from VS Code API */
    tab: vscode.Tab
}

/**
 * TabManager class handles tab enumeration and management for the Spectro Tab Tools extension.
 * 
 * This class provides functionality to:
 * - Enumerate open tabs across all editor groups
 * - Track tab URIs, access times, and group IDs
 * - Efficiently handle up to 50 open tabs with minimal performance impact
 * 
 * @example
 * ```typescript
 * const tabManager = new TabManager();
 * await tabManager.initialize();
 * const allTabs = tabManager.getAllTabs();
 * ```
 */
export class TabManager {
    private tabInfoMap: Map<string, TabInfo> = new Map()
    private disposables: vscode.Disposable[] = []
    private isInitialized: boolean = false
    
    // Performance optimization: debounce re-enumeration to prevent excessive calls
    private debouncedEnumerate: (() => void) | null = null
    private readonly DEBOUNCE_DELAY = 100 // ms
    
    // Performance optimization: cache for frequently accessed data
    private cachedTabsByAccessTime: TabInfo[] | null = null
    private cacheInvalidated: boolean = true

    /**
     * Creates a new TabManager instance
     */
    constructor() {
        // Set up debounced enumeration for performance optimization
        this.debouncedEnumerate = this.debounce(() => {
            this.enumerateTabs().catch(error => {
                console.error('Error during debounced tab enumeration:', error)
            })
        }, this.DEBOUNCE_DELAY)
    }

    /**
     * Initializes the TabManager and sets up event listeners
     * 
     * This method should be called once during extension activation to set up
     * the necessary event listeners and perform initial tab enumeration.
     * 
     * @returns Promise that resolves when initialization is complete
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return
        }

        // Set up event listeners for tab changes
        this.disposables.push(
            vscode.window.tabGroups.onDidChangeTabs(this.handleTabChanges.bind(this)),
            vscode.window.tabGroups.onDidChangeTabGroups(this.handleTabGroupChanges.bind(this))
        )

        // Perform initial tab enumeration
        await this.enumerateTabs()

        this.isInitialized = true
    }

    /**
     * Enumerates all open tabs across all editor groups
     * 
     * Uses the vscode.window.tabGroups API to iterate over all tab groups
     * and collect information about each tab.
     * 
     * @returns Promise that resolves when enumeration is complete
     */
    public async enumerateTabs(): Promise<void> {
        // Clear existing tab information
        this.tabInfoMap.clear()
        
        // Invalidate cache since we're rebuilding the tab data
        this.invalidateCache()

        // Iterate over all tab groups
        for (const group of vscode.window.tabGroups.all) {
            // Process each tab in the group
            for (const tab of group.tabs) {
                this.processTab(tab, group.viewColumn || 1)
            }
        }
    }

    /**
     * Gets all currently tracked tabs
     * 
     * @returns Array of TabInfo objects representing all tracked tabs
     */
    public getAllTabs(): TabInfo[] {
        // TODO: Implement method to return all tracked tabs
        return Array.from(this.tabInfoMap.values())
    }

    /**
     * Gets tab information for a specific URI
     * 
     * @param uri - The URI to look up
     * @returns TabInfo object if found, undefined otherwise
     */
    public getTabInfo(uri: vscode.Uri): TabInfo | undefined {
        // TODO: Implement method to get specific tab info
        return this.tabInfoMap.get(uri.toString())
    }

    /**
     * Updates the last access time for a tab
     * 
     * @param uri - The URI of the tab to update
     */
    public updateTabAccessTime(uri: vscode.Uri): void {
        const tabInfo = this.tabInfoMap.get(uri.toString())
        if (tabInfo) {
            tabInfo.lastAccessTime = Date.now()
            // Invalidate cache since access time has changed
            this.invalidateCache()
        }
    }

    /**
     * Adds or updates tab information
     * 
     * @param tab - The VS Code tab object
     * @param groupId - The ID of the group containing this tab
     */
    public addOrUpdateTab(tab: vscode.Tab, groupId: number): void {
        this.processTab(tab, groupId)
    }

    /**
     * Removes a tab from tracking
     * 
     * @param uri - The URI of the tab to remove
     */
    public removeTab(uri: vscode.Uri): void {
        const deleted = this.tabInfoMap.delete(uri.toString())
        if (deleted) {
            // Invalidate cache since tab data has changed
            this.invalidateCache()
        }
    }

    /**
     * Gets tabs sorted by last access time (most recent first)
     * 
     * @returns Array of TabInfo objects sorted by access time
     */
    public getTabsByAccessTime(): TabInfo[] {
        // Use cached result if available and cache is valid
        if (this.cachedTabsByAccessTime && !this.cacheInvalidated) {
            return this.cachedTabsByAccessTime
        }

        // Compute and cache the sorted tabs
        this.cachedTabsByAccessTime = Array.from(this.tabInfoMap.values())
            .sort((a, b) => b.lastAccessTime - a.lastAccessTime)
        this.cacheInvalidated = false

        return this.cachedTabsByAccessTime
    }

    /**
     * Gets the number of currently tracked tabs
     * 
     * @returns Number of tracked tabs
     */
    public getTabCount(): number {
        return this.tabInfoMap.size
    }

    /**
     * Checks if the TabManager has been initialized
     * 
     * @returns True if initialized, false otherwise
     */
    public isReady(): boolean {
        return this.isInitialized
    }

    /**
     * Debounce utility function to limit the rate of function execution
     * 
     * @param func - The function to debounce
     * @param delay - The delay in milliseconds
     * @returns Debounced function
     */
    private debounce(func: () => void, delay: number): () => void {
        let timeoutId: NodeJS.Timeout | undefined

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            timeoutId = setTimeout(func, delay)
        }
    }

    /**
     * Invalidates the sorted tabs cache to ensure fresh data on next access
     */
    private invalidateCache(): void {
        this.cacheInvalidated = true
        this.cachedTabsByAccessTime = null
    }

    /**
     * Processes a tab and extracts its information for tracking
     * 
     * @param tab - The VS Code tab object to process
     * @param groupId - The ID of the group containing this tab
     */
    private processTab(tab: vscode.Tab, groupId: number): void {
        let uri: vscode.Uri | undefined

        // Extract URI based on tab input type
        if (tab.input instanceof vscode.TabInputText) {
            uri = tab.input.uri
        } else if (tab.input instanceof vscode.TabInputNotebook) {
            uri = tab.input.uri
        } else if (tab.input instanceof vscode.TabInputCustom) {
            uri = tab.input.uri
        } else if (tab.input instanceof vscode.TabInputWebview) {
            // Webview tabs don't have URIs, create a unique identifier
            const webviewId = `webview:${tab.input.viewType}:${tab.label}`
            uri = vscode.Uri.parse(webviewId)
        }

        // Only track tabs that have URIs or can be uniquely identified
        if (uri) {
            const uriString = uri.toString()
            const existingTabInfo = this.tabInfoMap.get(uriString)
            const currentTime = Date.now()

            const tabInfo: TabInfo = {
                uri,
                lastAccessTime: existingTabInfo?.lastAccessTime || currentTime,
                groupId,
                tab
            }

            // Update access time if this is the active tab
            if (tab.isActive) {
                tabInfo.lastAccessTime = currentTime
            }

            this.tabInfoMap.set(uriString, tabInfo)
            
            // Invalidate cache since tab data has changed
            this.invalidateCache()
        }
    }

    /**
     * Handles tab change events from VS Code
     * 
     * @param event - The tab change event
     */
    private handleTabChanges(event: vscode.TabChangeEvent): void {
        // Handle opened tabs
        for (const tab of event.opened) {
            const group = vscode.window.tabGroups.all.find(g => g.tabs.includes(tab))
            if (group) {
                this.processTab(tab, group.viewColumn || 1)
            }
        }

        // Handle closed tabs
        for (const tab of event.closed) {
            let uri: vscode.Uri | undefined

            if (tab.input instanceof vscode.TabInputText) {
                uri = tab.input.uri
            } else if (tab.input instanceof vscode.TabInputNotebook) {
                uri = tab.input.uri
            } else if (tab.input instanceof vscode.TabInputCustom) {
                uri = tab.input.uri
            } else if (tab.input instanceof vscode.TabInputWebview) {
                const webviewId = `webview:${tab.input.viewType}:${tab.label}`
                uri = vscode.Uri.parse(webviewId)
            }

            if (uri) {
                this.tabInfoMap.delete(uri.toString())
            }
        }

        // Handle changed tabs (like becoming active)
        for (const tab of event.changed) {
            if (tab.isActive) {
                let uri: vscode.Uri | undefined

                if (tab.input instanceof vscode.TabInputText) {
                    uri = tab.input.uri
                } else if (tab.input instanceof vscode.TabInputNotebook) {
                    uri = tab.input.uri
                } else if (tab.input instanceof vscode.TabInputCustom) {
                    uri = tab.input.uri
                } else if (tab.input instanceof vscode.TabInputWebview) {
                    const webviewId = `webview:${tab.input.viewType}:${tab.label}`
                    uri = vscode.Uri.parse(webviewId)
                }

                if (uri) {
                    this.updateTabAccessTime(uri)
                }
            }
        }
    }

    /**
     * Handles tab group change events from VS Code
     * 
     * @param _event - The tab group change event
     */
    private handleTabGroupChanges(_event: vscode.TabGroupChangeEvent): void {
        // Use debounced enumeration to prevent excessive re-enumeration
        // when multiple group changes happen in quick succession
        if (this.debouncedEnumerate) {
            this.debouncedEnumerate()
        }
    }

    /**
     * Disposes of the TabManager and cleans up resources
     * 
     * This method should be called during extension deactivation to properly
     * clean up event listeners and prevent memory leaks.
     */
    public dispose(): void {
        // Dispose of all event listeners
        this.disposables.forEach(disposable => disposable.dispose())
        this.disposables = []

        // Clear tracking data and cache
        this.tabInfoMap.clear()
        this.invalidateCache()
        
        // Clean up debounced function
        this.debouncedEnumerate = null
        
        this.isInitialized = false
    }
} 