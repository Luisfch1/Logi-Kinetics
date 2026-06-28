// scratch/test-process-backup.js
// ES Module unit test runner for BackupModule._processBackupData

// Setup global mocks BEFORE importing any modules
globalThis.localStorage = {
    getItem: (key) => {
        if (key === 'logi2_projects') return '[{"id":"proj_abc","name":"Casa talud"}]';
        return "[]";
    },
    setItem: (key, val) => {
        console.log(`[Test Mock] localStorage.setItem: ${key} = ${val}`);
    },
    removeItem: (key) => {}
};

globalThis.document = {
    getElementById: (id) => null,
    documentElement: {
        style: {
            setProperty: (name, val) => {}
        },
        classList: {
            toggle: (name, force) => {},
            add: (name) => {},
            remove: (name) => {}
        }
    },
    body: {
        classList: {
            toggle: (name, force) => {},
            add: (name) => {},
            remove: (name) => {}
        }
    }
};

globalThis.window = {
    location: {
        reload: () => {
            console.log("[Test Mock] window.location.reload called!");
        }
    }
};

globalThis.alert = (msg) => {
    console.log(`[Test Mock] alert called: ${msg}`);
};

const mockBlobsStore = {
    "item_123": {
        id: "item_123",
        blob: {
            type: "image/jpeg",
            // Mock a Blob-like object in Node
            size: 100
        }
    }
};

globalThis.indexedDB = {
    open: (name) => {
        console.log(`[Test Mock] indexedDB.open called for: ${name}`);
        return {
            onsuccess: null,
            onerror: null,
            get result() {
                const onsuccess = () => {};
                return {
                    transaction: (storeNames, mode) => {
                        console.log(`[Test Mock] transaction started for: ${storeNames}`);
                        return {
                            objectStore: (sName) => {
                                return {
                                    get: (id) => {
                                        console.log(`[Test Mock] objectStore.get called for id: ${id}`);
                                        const req = {
                                            onsuccess: null,
                                            onerror: null,
                                            get result() {
                                                return mockBlobsStore[id] || null;
                                            }
                                        };
                                        setTimeout(() => {
                                            if (req.onsuccess) req.onsuccess();
                                        }, 5);
                                        return req;
                                    }
                                };
                            },
                            close: () => {}
                        };
                    },
                    close: () => {
                        console.log("[Test Mock] legacy db closed.");
                    }
                };
            }
        };
    }
};

// Mock the open trigger success callback
const originalOpen = globalThis.indexedDB.open;
globalThis.indexedDB.open = function(name) {
    const req = originalOpen(name);
    setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
    }, 10);
    return req;
};

globalThis.FileReader = class {
    constructor() {
        this.onloadend = null;
    }
    readAsDataURL(blob) {
        console.log("[Test Mock] FileReader.readAsDataURL called");
        setTimeout(() => {
            this.result = "data:image/jpeg;base64,mocked_base64_data_from_legacy_db";
            if (this.onloadend) this.onloadend();
        }, 10);
    }
};

// Now import the modules dynamically
const { BackupModule } = await import('../src/core/BackupModule.js');
const { LogiNative } = await import('../src/core/capacitor-bridge.js');

// Spies for LogiNative calls
const calls = [];
LogiNative.isNative = () => false;
LogiNative.dbPut = async (store, item) => {
    calls.push({ method: 'dbPut', store, item });
    return true;
};
LogiNative.dbCommitBatch = async (store, items) => {
    calls.push({ method: 'dbCommitBatch', store, items });
    return true;
};
LogiNative.dbPutCatalog = async (projectId, items) => {
    calls.push({ method: 'dbPutCatalog', projectId, items });
    return true;
};
LogiNative.storeBlob = async (filename, base64) => {
    calls.push({ method: 'storeBlob', filename, base64 });
    return true;
};

// Mock JSZip ZIP structure
const mockZip = {
    files: {
        "backup.json": {
            async: async (type) => JSON.stringify(backupData)
        },
        "photos/item_123.jpg": {
            name: "photos/item_123.jpg",
            dir: false,
            // Mock JSZip internal metadata structure showing uncompressed size = 0 (empty file)
            _data: {
                uncompressedSize: 0
            },
            async: async (type) => "" // returns empty string since it is 0-bytes
        }
    },
    file: function(name) {
        return this.files[name] || null;
    }
};

// Input backup.json metadata matching legacy single-project format
const backupData = {
    schemaVersion: 2,
    type: "project",
    projectId: "proj_abc",
    projectName: "Casa talud",
    app: "Logi",
    createdAt: new Date().toISOString(),
    items: [
        {
            id: "item_123",
            descripcion: "Test image with 0-bytes in zip but existing in legacy db",
            itemCode: "COLUMNA",
            createdAt: Date.now(),
            projectId: "proj_abc",
            projectName: "Casa talud",
            filename: "item_123.jpg"
        }
    ]
};

// Run the verification
console.log("Starting BackupModule import unit test...");
BackupModule._processBackupData(backupData, mockZip).then(() => {
    console.log("\n--- TEST LOGS ---");
    console.log("Total calls intercepted:", calls.length);
    console.log(JSON.stringify(calls, null, 2));

    // Verify recovery worked
    const storeBlobCall = calls.find(c => c.method === 'storeBlob');
    if (storeBlobCall) {
        console.log("\n✅ SUCCESS: storeBlob was called with recovered photo!");
        console.log(`   Filename: ${storeBlobCall.filename}`);
        console.log(`   Base64 Data: ${storeBlobCall.base64}`);
    } else {
        console.log("\n❌ FAILURE: storeBlob was not called!");
    }
    process.exit(0);
}).catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
